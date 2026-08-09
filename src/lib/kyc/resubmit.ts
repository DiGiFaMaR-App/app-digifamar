/**
 * Farmer-side KYC resubmission.
 *
 * After a rejection the farmer uploads a replacement document; this recomputes
 * their overall verification from the effective (latest-per-type) document set
 * and clears the stale rejection reason so admins see it back in the queue.
 */
import { supabase } from "@/integrations/supabase/client";
import { computeVerification, type KycDocLike, type VerificationStatus } from "./status";

export async function refreshVerificationAfterResubmit(
  userId: string,
): Promise<VerificationStatus> {
  const { data: docs, error } = await supabase
    .from("farmer_kyc_documents")
    .select("doc_type, status, created_at")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  const verification = computeVerification((docs ?? []) as KycDocLike[]);

  const patch: { verification_status: string; rejection_reason: string | null } = {
    verification_status: verification,
    rejection_reason: null,
  };
  const fp = supabase.from("farmer_profiles") as unknown as {
    update: (p: typeof patch) => {
      eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
    };
  };
  const { error: profileError } = await fp.update(patch).eq("user_id", userId);
  if (profileError) throw new Error(profileError.message);

  return verification;
}
