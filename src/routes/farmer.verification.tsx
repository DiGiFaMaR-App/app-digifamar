import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, FileUp, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { refreshVerificationAfterResubmit } from "@/lib/kyc/resubmit";
import { latestPerType } from "@/lib/kyc/status";

export const Route = createFileRoute("/farmer/verification")({
  head: () => ({
    meta: [
      { title: "Farm Verification — DiGiFaMaR" },
      {
        name: "description",
        content:
          "Upload your farm verification documents and track your KYC review status on DiGiFaMaR.",
      },
      { property: "og:title", content: "Farm Verification — DiGiFaMaR" },
      {
        property: "og:description",
        content: "Upload verification documents and track your DiGiFaMaR review status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <VerificationPage />
    </RequireAuth>
  ),
});

const DOC_TYPES = [
  { value: "government_id", label: "Government ID" },
  { value: "farm_registration", label: "Farm registration" },
  { value: "proof_of_address", label: "Proof of address" },
  { value: "certification", label: "Certification (organic, USDA…)" },
  { value: "other", label: "Other" },
] as const;

const MAX_BYTES = 10 * 1024 * 1024;

type DocRow = {
  id: string;
  doc_type: string;
  file_name: string | null;
  storage_path: string;
  status: string;
  review_notes: string | null;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-primary/15 text-primary",
  rejected: "bg-destructive/15 text-destructive",
  pending: "bg-muted text-muted-foreground",
};

function VerificationPage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [farmStatus, setFarmStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [docType, setDocType] = useState<string>("government_id");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const [{ data: rows }, { data: profile }] = await Promise.all([
      supabase
        .from("farmer_kyc_documents")
        .select("id, doc_type, file_name, storage_path, status, review_notes, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("farmer_profiles")
        .select("verification_status, rejection_reason")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    setDocs((rows ?? []) as DocRow[]);
    setFarmStatus(
      (profile as { verification_status?: string } | null)?.verification_status ?? null,
    );
    setRejectionReason(
      (profile as { rejection_reason?: string | null } | null)?.rejection_reason ?? null,
    );
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onFile = async (file: File | undefined) => {
    if (!file || !user?.id) return;
    if (file.size > MAX_BYTES) {
      toast.error("File is larger than 10MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
      const path = `${user.id}/${docType}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("kyc-documents")
        .upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (upErr) throw new Error(upErr.message);

      const { error } = await supabase.from("farmer_kyc_documents").insert({
        user_id: user.id,
        doc_type: docType,
        storage_path: path,
        file_name: file.name.slice(0, 120),
      });
      if (error) throw new Error(error.message);

      // A replacement supersedes an earlier rejection — move back into review.
      const next = await refreshVerificationAfterResubmit(user.id);
      toast.success(
        next === "under_review"
          ? "Document resubmitted — your farm is back under review"
          : "Document uploaded — an admin will review it",
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };


  const removeDoc = async (doc: DocRow) => {
    try {
      await supabase.storage.from("kyc-documents").remove([doc.storage_path]);
      const { error } = await supabase.from("farmer_kyc_documents").delete().eq("id", doc.id);
      if (error) throw new Error(error.message);
      toast.success("Document removed");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove document");
    }
  };

  const verified = farmStatus === "approved" || farmStatus === "verified";

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="flex items-center gap-2 text-3xl font-extrabold sm:text-4xl">
          <ShieldCheck className="h-7 w-7 text-primary" /> Farm verification
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verified farms get a badge across DiGiFaMaR and rank higher in browse results.
        </p>

        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Current status
          </p>
          <p className="mt-1 flex items-center gap-2 text-lg font-bold capitalize">
            {verified && <BadgeCheck className="h-5 w-5 text-primary" />}
            {(farmStatus ?? "not submitted").replace("_", " ")}
          </p>
          {rejectionReason && farmStatus === "rejected" && (
            <p className="mt-1 text-sm text-destructive">{rejectionReason}</p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            Reviews are done manually by our team. You'll get a notification the moment your status
            changes.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-bold">Upload a document</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {DOC_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setDocType(t.value)}
                aria-pressed={docType === t.value}
                className={`min-h-11 rounded-full border px-3 text-sm ${
                  docType === t.value
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <label className="mt-4 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm font-medium hover:bg-accent">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="h-4 w-4 text-primary" />
            )}
            {uploading ? "Uploading…" : "Choose a file (PDF or image, max 10MB)"}
            <input
              type="file"
              className="sr-only"
              accept="image/*,application/pdf"
              disabled={uploading}
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
          </label>
        </div>

        <div className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Your documents
          </h2>
          {loading && <p className="mt-3 text-sm text-muted-foreground">Loading…</p>}
          {!loading && docs.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">No documents uploaded yet.</p>
          )}
          <ul className="mt-3 space-y-2">
            {docs.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {DOC_TYPES.find((t) => t.value === d.doc_type)?.label ?? d.doc_type}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {d.file_name ?? d.storage_path} · {new Date(d.created_at).toLocaleDateString()}
                  </p>
                  {d.review_notes && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{d.review_notes}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${
                      STATUS_STYLES[d.status] ?? STATUS_STYLES['pending']
                    }`}
                  >
                    {d.status}
                  </span>
                  {d.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => void removeDoc(d)}
                      aria-label="Remove document"
                      className="rounded-md p-2 text-muted-foreground hover:bg-accent"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8">
          <Button asChild variant="outline">
            <Link to="/dashboard/farmer">← Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}
