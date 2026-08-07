/**
 * Structured dispute workflow for an order.
 *
 * - Either party can file a claim (reason + evidence files) while funds are held.
 * - The other party can post a counter-claim; both can add evidence/comments.
 * - A read-only adjudication timeline shows every step until an admin resolves.
 * - While a dispute is open the order sits in `disputed`, so the release action
 *   on the order page is blocked (release is only offered in `inspection`).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Gavel,
  Loader2,
  MessageSquare,
  Paperclip,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { raiseDisputeFn } from "@/lib/escrow-v2/escrow.functions";

const EVIDENCE_BUCKET = "dispute-evidence";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const SIGNED_URL_TTL = 60 * 60 * 24 * 365; // 1 year

export type DisputeRow = {
  id: string;
  order_id: string;
  raised_by: string;
  reason: string;
  evidence_urls: string[];
  state: string;
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
};

export type DisputeEventRow = {
  id: string;
  author_id: string | null;
  author_role: string;
  kind: string;
  body: string | null;
  evidence_urls: string[];
  created_at: string;
};

const KIND_LABEL: Record<string, string> = {
  claim: "Claim filed",
  counter_claim: "Counter-claim",
  evidence: "Evidence added",
  comment: "Comment",
  status_change: "Status update",
  resolution: "Admin decision",
};

const STATE_LABEL: Record<string, string> = {
  open: "Open — awaiting admin review",
  under_review: "Under review",
  resolved: "Resolved",
  rejected: "Rejected",
};

function roleLabel(r: string) {
  return r === "buyer" ? "Buyer" : r === "farmer" ? "Farmer" : r === "admin" ? "Admin" : "System";
}

export function DisputePanel({
  orderId,
  role,
  userId,
  orderStatus,
  onChanged,
}: {
  orderId: string;
  role: "buyer" | "farmer";
  userId: string;
  orderStatus: string;
  onChanged?: () => void;
}) {
  const [dispute, setDispute] = useState<DisputeRow | null>(null);
  const [events, setEvents] = useState<DisputeEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [fileOpen, setFileOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reply, setReply] = useState("");
  const [pending, setPending] = useState<File[]>([]);
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const claimInputRef = useRef<HTMLInputElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);

  const canFile = [
    "escrow_funded",
    "awaiting_delivery",
    "shipped",
    "delivered",
    "inspection",
  ].includes(orderStatus);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: d } = await supabase
      .from("disputes")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setDispute((d as DisputeRow) ?? null);
    if (d) {
      const { data: ev } = await supabase
        .from("dispute_events")
        .select("id, author_id, author_role, kind, body, evidence_urls, created_at")
        .eq("dispute_id", (d as DisputeRow).id)
        .order("created_at", { ascending: true });
      setEvents((ev as DisputeEventRow[]) ?? []);
    } else {
      setEvents([]);
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const uploadAll = async (files: File[]) => {
    const urls: string[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is larger than 10MB`);
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
      const path = `${orderId}/${userId}/${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from(EVIDENCE_BUCKET).upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (error) throw new Error(`Upload failed: ${error.message}`);
      const { data: signed, error: sErr } = await supabase.storage
        .from(EVIDENCE_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL);
      if (sErr || !signed?.signedUrl) throw new Error("Could not link the uploaded file");
      urls.push(signed.signedUrl);
    }
    return urls;
  };

  const fileClaim = async () => {
    setBusy(true);
    try {
      const evidenceUrls = await uploadAll(pending);
      const created = await raiseDisputeFn({
        data: { orderId, reason: reason.trim(), evidenceUrls },
      });
      await supabase.from("dispute_events").insert({
        dispute_id: (created as { id: string }).id,
        order_id: orderId,
        author_id: userId,
        author_role: role,
        kind: "claim",
        body: reason.trim(),
        evidence_urls: evidenceUrls,
      });
      toast.success("Dispute filed — release is paused until it's resolved");
      setFileOpen(false);
      setReason("");
      setPending([]);
      await load();
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not file the dispute");
    } finally {
      setBusy(false);
    }
  };

  const postEntry = async (kind: "counter_claim" | "comment" | "evidence") => {
    if (!dispute) return;
    setBusy(true);
    try {
      const evidenceUrls = await uploadAll(replyFiles);
      const { error } = await supabase.from("dispute_events").insert({
        dispute_id: dispute.id,
        order_id: orderId,
        author_id: userId,
        author_role: role,
        kind: evidenceUrls.length && !reply.trim() ? "evidence" : kind,
        body: reply.trim() || null,
        evidence_urls: evidenceUrls,
      });
      if (error) throw new Error(error.message);
      setReply("");
      setReplyFiles([]);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not post to the dispute");
    } finally {
      setBusy(false);
    }
  };

  const hasCounterClaim = useMemo(
    () => events.some((e) => e.kind === "counter_claim" && e.author_role === role),
    [events, role],
  );
  const isClaimant = dispute?.raised_by === userId;
  const closed = dispute ? ["resolved", "rejected"].includes(dispute.state) : false;

  if (loading) {
    return (
      <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
        Loading dispute status…
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Gavel className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Dispute resolution
        </h2>
      </div>

      {!dispute && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Something wrong with this order? Filing a dispute freezes the escrowed funds — nothing
            is released to the farmer until an admin decides.
          </p>
          <Button
            variant="destructive"
            className="w-full"
            disabled={!canFile}
            onClick={() => setFileOpen(true)}
          >
            <AlertTriangle className="mr-2 h-4 w-4" /> File a dispute
          </Button>
          {!canFile && (
            <p className="text-xs text-muted-foreground">
              Disputes can be filed once funds are in escrow and before the order is settled.
            </p>
          )}
        </div>
      )}

      {dispute && (
        <div className="mt-4 space-y-4">
          <div
            className={`flex items-start gap-3 rounded-xl border p-4 ${
              closed ? "border-primary/30 bg-primary/10" : "border-amber-500/30 bg-amber-500/10"
            }`}
          >
            {closed ? (
              <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-400" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold">{STATE_LABEL[dispute.state] ?? dispute.state}</p>
              <p className="text-xs text-muted-foreground">
                {isClaimant ? "You" : roleLabel(role === "buyer" ? "farmer" : "buyer")} filed this
                dispute on {new Date(dispute.created_at).toLocaleString()}.
                {!closed && " Escrow release is paused until an admin resolves it."}
              </p>
              {dispute.resolution && (
                <p className="mt-2 rounded-lg bg-background/50 p-2 text-xs">
                  <span className="font-semibold">Admin decision: </span>
                  {dispute.resolution}
                </p>
              )}
            </div>
          </div>

          {/* Adjudication timeline */}
          <ol className="relative space-y-4 border-l border-border pl-5">
            <TimelineItem
              title="Dispute opened"
              role={isClaimant ? role : role === "buyer" ? "farmer" : "buyer"}
              at={dispute.created_at}
              body={dispute.reason}
              evidence={dispute.evidence_urls}
            />
            {events
              .filter((e) => e.kind !== "claim")
              .map((e) => (
                <TimelineItem
                  key={e.id}
                  title={KIND_LABEL[e.kind] ?? e.kind}
                  role={e.author_role}
                  at={e.created_at}
                  body={e.body}
                  evidence={e.evidence_urls}
                />
              ))}
            {closed && dispute.resolved_at && (
              <TimelineItem
                title="Resolved by admin"
                role="admin"
                at={dispute.resolved_at}
                body={dispute.resolution}
                evidence={[]}
              />
            )}
          </ol>

          {!closed && (
            <div className="rounded-xl border border-border bg-background/40 p-3">
              <Textarea
                rows={3}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={
                  isClaimant || hasCounterClaim
                    ? "Add a comment or more evidence for the admin…"
                    : "Respond with your side of the story (counter-claim)…"
                }
              />
              <input
                ref={replyInputRef}
                type="file"
                multiple
                accept="image/*,video/*,application/pdf"
                className="hidden"
                onChange={(e) => setReplyFiles(Array.from(e.target.files ?? []))}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => replyInputRef.current?.click()}
                >
                  <Upload className="mr-1 h-3.5 w-3.5" /> Attach evidence
                </Button>
                {replyFiles.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {replyFiles.length} file{replyFiles.length > 1 ? "s" : ""} ready
                  </span>
                )}
                <Button
                  type="button"
                  size="sm"
                  className="ml-auto"
                  disabled={busy || (!reply.trim() && replyFiles.length === 0)}
                  onClick={() =>
                    postEntry(isClaimant || hasCounterClaim ? "comment" : "counter_claim")
                  }
                >
                  {busy ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <MessageSquare className="mr-1 h-3.5 w-3.5" />
                  )}
                  {isClaimant || hasCounterClaim ? "Post update" : "Submit counter-claim"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={fileOpen} onOpenChange={setFileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>File a dispute</DialogTitle>
            <DialogDescription>
              Describe what went wrong and attach photos, video or documents. Escrowed funds stay
              frozen until an admin decides how they are split.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={5}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What was wrong with this order? (min 10 characters)"
          />
          <input
            ref={claimInputRef}
            type="file"
            multiple
            accept="image/*,video/*,application/pdf"
            className="hidden"
            onChange={(e) => setPending(Array.from(e.target.files ?? []))}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => claimInputRef.current?.click()}>
              <Paperclip className="mr-1 h-3.5 w-3.5" /> Attach evidence
            </Button>
            {pending.map((f) => (
              <span
                key={f.name}
                className="max-w-[12rem] truncate rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
              >
                {f.name}
              </span>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFileOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy || reason.trim().length < 10}
              onClick={fileClaim}
            >
              {busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />} File dispute
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TimelineItem({
  title,
  role,
  at,
  body,
  evidence,
}: {
  title: string;
  role: string;
  at: string;
  body: string | null;
  evidence: string[];
}) {
  return (
    <li className="relative">
      <span className="absolute -left-[1.44rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
      <div className="flex flex-wrap items-baseline gap-2">
        <p className="text-sm font-semibold">{title}</p>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
          {roleLabel(role)}
        </span>
        <span className="text-xs text-muted-foreground">{new Date(at).toLocaleString()}</span>
      </div>
      {body && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{body}</p>}
      {evidence?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {evidence.map((url, i) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Paperclip className="h-3 w-3" /> Evidence {i + 1}
            </a>
          ))}
        </div>
      )}
    </li>
  );
}
