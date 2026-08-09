/**
 * Admin KYC review actions.
 *
 * Runs under the admin's own session — the "Admin full-access" RLS policies
 * authorize the writes. Approving/rejecting a document also rolls the farmer's
 * overall `verification_status` forward, and database triggers turn both
 * changes into in-app notifications for the farmer.
 */
import { supabase } from "@/integrations/supabase/client";
import { computeVerification, rollUpVerification } from "@/lib/kyc/status";
import type { KycDocLike, VerificationStatus } from "@/lib/kyc/status";

export type KycDecision = "approved" | "rejected";
export type { VerificationStatus };
export { rollUpVerification };

export async function reviewKycDocument(input: {
  docId: string;
  userId: string;
  decision: KycDecision;
  notes?: string | null;
}): Promise<{ verification: VerificationStatus }> {
  const { data: auth } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("farmer_kyc_documents")
    .update({
      status: input.decision,
      review_notes: input.notes?.trim() || null,
      reviewed_by: auth.user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.docId);
  if (error) throw new Error(error.message);

  // Recompute the farmer's overall verification from their effective documents.
  const { data: docs, error: readError } = await supabase
    .from("farmer_kyc_documents")
    .select("doc_type, status, created_at")
    .eq("user_id", input.userId);
  if (readError) throw new Error(readError.message);

  const verification = computeVerification((docs ?? []) as KycDocLike[]);

  const patch: { verification_status: string; rejection_reason: string | null } = {
    verification_status: verification,
    rejection_reason:
      verification === "rejected" ? (input.notes?.trim() || "Document rejected") : null,
  };
  const fp = supabase.from("farmer_profiles") as unknown as {
    update: (p: typeof patch) => {
      eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
    };
  };
  const { error: profileError } = await fp.update(patch).eq("user_id", input.userId);
  if (profileError) throw new Error(profileError.message);

  return { verification };
}
