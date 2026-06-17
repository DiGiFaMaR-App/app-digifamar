/**
 * Admin landing — role-gated dispute queue + ledger search.
 * Role check happens both in the server functions (defense in depth) and
 * here for UX (so non-admins see a clear message instead of an error toast).
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import {
  listLedgerForOrderFn,
  listOpenDisputesFn,
} from "@/lib/admin/admin.functions";
import { resolveDisputeFn } from "@/lib/escrow-v2/escrow.functions";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Admin — DiGiFaMaR" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <RequireAuth>
      <AdminPage />
    </RequireAuth>
  ),
});

function AdminPage() {
  const { role, loading } = useAuth();
  if (loading) return <SiteLayout><div className="p-8 text-[#F0FFF0]">Loading…</div></SiteLayout>;
  if (role !== "admin") {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-xl px-5 py-16 text-[#F0FFF0]">
          <h1 className="text-2xl font-bold mb-2">Admin access required</h1>
          <p className="text-[#F0FFF0]/70">Your account does not have admin privileges.</p>
        </div>
      </SiteLayout>
    );
  }
  return <AdminBody />;
}

function AdminBody() {
  const listDisputes = useServerFn(listOpenDisputesFn);
  const { data: disputes, refetch } = useQuery({
    queryKey: ["admin", "disputes"],
    queryFn: () => listDisputes(),
  });

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-5 py-10 text-[#F0FFF0]">
        <h1 className="text-3xl font-bold mb-6">Admin · Dispute queue</h1>

        {(!disputes || disputes.length === 0) && (
          <p className="text-[#F0FFF0]/70">No open disputes.</p>
        )}

        <ul className="space-y-4">
          {(disputes ?? []).map((d) => (
            <DisputeCard key={d.id} dispute={d} onResolved={() => refetch()} />
          ))}
        </ul>

        <LedgerSearch />
      </div>
    </SiteLayout>
  );
}

type Dispute = {
  id: string;
  order_id: string;
  raised_by: string;
  reason: string;
  evidence_urls: string[];
  state: string;
  created_at: string;
};

function DisputeCard({ dispute, onResolved }: { dispute: Dispute; onResolved: () => void }) {
  const resolve = useServerFn(resolveDisputeFn);
  const [resolution, setResolution] = useState("");
  const [refund, setRefund] = useState("");
  const [busy, setBusy] = useState(false);

  const act = async (outcome: "release" | "refund" | "split") => {
    if (!resolution.trim()) {
      toast.error("Add a resolution note");
      return;
    }
    setBusy(true);
    try {
      await resolve({
        data: {
          disputeId: dispute.id,
          outcome,
          buyerRefundCents: outcome === "split" ? Number(refund) || 0 : undefined,
          resolution,
        },
      });
      toast.success("Dispute resolved");
      onResolved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="border border-white/15 rounded-lg p-4 bg-black/40">
      <div className="flex justify-between text-sm text-[#F0FFF0]/70 mb-2">
        <span>Order {dispute.order_id.slice(0, 8)}…</span>
        <span>{new Date(dispute.created_at).toLocaleString()}</span>
      </div>
      <p className="mb-2"><strong>Reason:</strong> {dispute.reason}</p>
      {dispute.evidence_urls.length > 0 && (
        <ul className="text-sm mb-2 list-disc pl-5">
          {dispute.evidence_urls.map((u) => (
            <li key={u}><a href={u} target="_blank" rel="noreferrer" className="underline text-[#39FF14]">{u}</a></li>
          ))}
        </ul>
      )}
      <Textarea
        placeholder="Resolution notes (required)"
        value={resolution}
        onChange={(e) => setResolution(e.target.value)}
        className="bg-black/40 border-white/15 mb-2"
      />
      <Input
        type="number"
        placeholder="Partial refund to buyer (cents) — for split only"
        value={refund}
        onChange={(e) => setRefund(e.target.value)}
        className="bg-black/40 border-white/15 mb-3"
      />
      <div className="flex gap-2">
        <Button disabled={busy} onClick={() => act("release")} variant="secondary">Release to farmer</Button>
        <Button disabled={busy} onClick={() => act("refund")} variant="destructive">Full refund to buyer</Button>
        <Button disabled={busy} onClick={() => act("split")} variant="outline">Split</Button>
      </div>
    </li>
  );
}

function LedgerSearch() {
  const [orderId, setOrderId] = useState("");
  const fn = useServerFn(listLedgerForOrderFn);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const search = async () => {
    try {
      const r = await fn({ data: { orderId } });
      setRows(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold mb-3">Ledger search</h2>
      <div className="flex gap-2 mb-3">
        <Input
          placeholder="Order UUID"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          className="bg-black/40 border-white/15"
        />
        <Button onClick={search}>Search</Button>
      </div>
      {rows.length > 0 && (
        <pre className="text-xs bg-black/60 p-3 rounded overflow-auto border border-white/10">
{JSON.stringify(rows, null, 2)}
        </pre>
      )}
    </section>
  );
}
