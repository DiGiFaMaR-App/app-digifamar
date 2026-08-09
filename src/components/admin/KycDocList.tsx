import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type KycDoc = {
  id: string;
  doc_type: string;
  file_name: string | null;
  storage_path: string;
  status: string;
  review_notes: string | null;
  created_at: string;
};

/** Admin-only list of a farmer's KYC documents with signed preview links. */
export function KycDocList({ userId }: { userId: string }) {
  const [busy, setBusy] = useState<string | null>(null);
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

  const review = async (doc: KycDoc, status: "approved" | "rejected") => {
    setBusy(doc.id);
    try {
      let notes: string | null = null;
      if (status === "rejected") {
        notes = window.prompt("Why is this document rejected? (shown to the farmer)") ?? null;
        if (notes === null) return;
      }
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("farmer_kyc_documents")
        .update({
          status,
          review_notes: notes,
          reviewed_by: auth.user?.id ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", doc.id);
      if (error) throw new Error(error.message);
      toast.success(`Document ${status}`);
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
                onClick={() => void review(d, "rejected")}
                className="border-red-400/40 text-red-300 hover:bg-red-500/10"
              >
                Reject doc
              </Button>
            )}
          </div>
          {d.review_notes && <p className="mt-1 text-xs text-white/50">{d.review_notes}</p>}
        </li>
      ))}
    </ul>
  );
}
