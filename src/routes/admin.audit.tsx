/**
 * Admin · Audit — read-only viewer for the audit_logs table.
 * Surfaces sensitive activity: admin role grants, settings changes,
 * OTP generation/verification, escrow funding/release, dispute resolution.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AdminGate } from "@/components/AdminGate";
import { RequireAuth } from "@/components/RequireAuth";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listAuditLogsFn } from "@/lib/admin/audit.functions";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({
    meta: [
      { title: "Admin · Audit Log — DiGiFaMaR" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AdminGate>
        <AuditBody />
      </AdminGate>
    </RequireAuth>
  ),
});

function badgeVariant(outcome: string) {
  if (outcome === "failure") return "destructive" as const;
  if (outcome === "denied") return "destructive" as const;
  return "default" as const;
}

function AuditBody() {
  const list = useServerFn(listAuditLogsFn);
  const [action, setAction] = useState("");
  const [resourceId, setResourceId] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["audit_logs", action, resourceId],
    queryFn: () =>
      list({
        data: {
          limit: 200,
          action: action.trim() || undefined,
          resourceId: resourceId.trim() || undefined,
        },
      }),
  });

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-5 py-10 text-[#F0FFF0] space-y-4">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold">Admin · Audit Log</h1>
          <p className="text-[#F0FFF0]/70 text-sm">
            Sensitive admin actions and delivery/OTP events. Append-only —
            entries cannot be edited or deleted.
          </p>
        </header>

        <Card className="p-4 bg-black/40 border-white/15 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="Filter by action (e.g. otp.generate)"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="bg-black/40 border-white/15"
            />
            <Input
              placeholder="Filter by resource id"
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              className="bg-black/40 border-white/15"
            />
            <Button onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Loading…" : "Refresh"}
            </Button>
          </div>
        </Card>

        <Card className="p-0 bg-black/40 border-white/15 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[#F0FFF0]/70">
                <tr className="border-b border-white/10">
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Actor</th>
                  <th className="px-3 py-2">Resource</th>
                  <th className="px-3 py-2">Outcome</th>
                  <th className="px-3 py-2">Metadata</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-[#F0FFF0]/60">
                      Loading…
                    </td>
                  </tr>
                )}
                {!isLoading && (data?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-[#F0FFF0]/60">
                      No entries.
                    </td>
                  </tr>
                )}
                {data?.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 align-top">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{r.action}</td>
                    <td className="px-3 py-2 text-xs">
                      <div className="font-mono">{r.actor_id ?? "system"}</div>
                      <div className="text-[#F0FFF0]/60">{r.actor_role ?? ""}</div>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <div>{r.resource_type}</div>
                      <div className="font-mono text-[#F0FFF0]/60">{r.resource_id ?? ""}</div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={badgeVariant(r.outcome)}>{r.outcome}</Badge>
                    </td>
                    <td className="px-3 py-2 text-xs font-mono max-w-[28rem]">
                      <pre className="whitespace-pre-wrap break-all text-[#F0FFF0]/80">
                        {JSON.stringify(r.metadata, null, 0)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </SiteLayout>
  );
}
