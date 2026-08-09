import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reviewKycDocument, type KycDecision } from "@/lib/admin/kyc.functions";

type KycDoc = {
  id: string;
  doc_type: string;
  file_name: string | null;
  storage_path: string;
  status: string;
  review_notes: string | null;
  created_at: string;
};

const VERIFICATION_COPY: Record<string, string> = {
  approved: "Farmer is now verified — the verified badge shows on their farm profile.",
  rejected: "Farmer marked as rejected — they were notified with your reason.",
  under_review: "Farmer is under review — remaining documents still need a decision.",
  pending: "Farmer is back to pending.",
};

/** Admin-only list of a farmer's KYC documents with signed preview links. */
export function KycDocList({ userId }: { userId: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "kyc-docs", userId],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("farmer_kyc_documents")
        .select("id, doc_type, file_name, storage_path, status, review_notes, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (rows ?? []) as KycDoc[];
    },
  });

  const open = async (doc: KycDoc) => {
    const { data: signed, error } = await supabase.storage
      .from("kyc-documents")
      .createSignedUrl(doc.storage_path, 300);
    if (error || !signed?.signedUrl) {
      toast.error(error?.message ?? "Could not open document");
      return;
    }
    window.open(signed.signedUrl, "_blank", "noopener");
  };

  const review = async (doc: KycDoc, decision: KycDecision, notes?: string) => {
    setBusy(doc.id);
    try {
      const { verification } = await reviewKycDocument({
        docId: doc.id,
        userId,
        decision,
        notes: notes ?? null,
      });
      toast.success(`Document ${decision}`, {
        description: VERIFICATION_COPY[verification] ?? undefined,
      });
      setRejecting(null);
      setReason("");
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Review failed");
    } finally {
      setBusy(null);
    }
  };

  if (isLoading) return <p className="text-xs text-white/40">Loading documents…</p>;
  if (!data || data.length === 0)
    return <p className="text-xs text-white/40">No documents uploaded.</p>;

  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.id} className="rounded-md border border-white/10 p-2">
          <div className="flex flex-wrap items-center gap-2">
            <FileText className="h-4 w-4 text-white/50" />
            <span className="text-xs capitalize">{d.doc_type.replace(/_/g, " ")}</span>
            <span className="text-xs text-white/40">{d.file_name ?? ""}</span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] capitalize">
              {d.status}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => void open(d)}>
              View
            </Button>
            {d.status !== "approved" && (
              <Button
                size="sm"
                disabled={busy === d.id}
                onClick={() => void review(d, "approved")}
                className="bg-[#22C55E] text-black hover:bg-[#16A34A]"
              >
                {busy === d.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                Approve doc
              </Button>
            )}
            {d.status !== "rejected" && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy === d.id}
                onClick={() => {
                  setRejecting(rejecting === d.id ? null : d.id);
                  setReason("");
                }}
                className="border-red-400/40 text-red-300 hover:bg-red-500/10"
              >
                Reject doc
              </Button>
            )}
          </div>

          {rejecting === d.id && (
            <div className="mt-2 space-y-2">
              <label className="text-[11px] text-white/50" htmlFor={`reason-${d.id}`}>
                Reason shown to the farmer
              </label>
              <Textarea
                id={`reason-${d.id}`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={280}
                rows={2}
                placeholder="e.g. The ID photo is blurry — please re-upload a clear scan."
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={busy === d.id || reason.trim().length < 5}
                  onClick={() => void review(d, "rejected", reason)}
                  className="bg-red-500 text-white hover:bg-red-600"
                >
                  {busy === d.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  Confirm rejection
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setRejecting(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {d.review_notes && <p className="mt-1 text-xs text-white/50">{d.review_notes}</p>}
        </li>
      ))}
    </ul>
  );
}
