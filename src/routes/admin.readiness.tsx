import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminGate } from "@/components/AdminGate";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import {
  getGoLiveReadinessFn,
  type ReadinessCheck,
  type ReadinessReport,
} from "@/lib/ops/readiness.functions";

export const Route = createFileRoute("/admin/readiness")({
  head: () => ({
    meta: [
      { title: "Go-live readiness — DiGiFaMaR" },
      {
        name: "description",
        content:
          "Read-only check of payments, escrow, notifications and marketplace supply before DiGiFaMaR accepts real orders.",
      },
      { property: "og:title", content: "Go-live readiness — DiGiFaMaR" },
      {
        property: "og:description",
        content: "Operational readiness status for payments, escrow release and marketplace supply.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AdminGate>
        <ReadinessPage />
      </AdminGate>
    </RequireAuth>
  ),
});

function StatusBadge({ status }: { status: ReadinessCheck["status"] }) {
  const label = status === "ready" ? "Ready" : status === "warning" ? "Needs attention" : "Blocked";
  return (
    <Badge variant={status === "ready" ? "default" : status === "blocked" ? "destructive" : "secondary"}>
      {label}
    </Badge>
  );
}

function ReadinessPage() {
  const [report, setReport] = useState<ReadinessReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setReport(await getGoLiveReadinessFn());
    } catch (e) {
      setReport(null);
      setError(e instanceof Error ? e.message : "Could not run the readiness check");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Go-live readiness</h1>
          <p className="text-sm text-muted-foreground">
            Read-only status of everything a real, money-moving order depends on. Nothing on this
            page changes settings or moves funds.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void run()} disabled={busy} variant="outline" className="min-h-11">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Re-run check
          </Button>
          {report ? (
            <span className="text-xs text-muted-foreground">
              {report.stripeEnv === "live" ? "Live payments" : "Test payments"} ·{" "}
              {new Date(report.checkedAt).toLocaleString()}
            </span>
          ) : null}
        </div>

        {error ? (
          <Card className="border-destructive/40 p-4 text-sm text-destructive" role="alert">
            {error}
          </Card>
        ) : null}

        {report ? (
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">Overall</span>
              <StatusBadge status={report.overall} />
            </div>
            <div className="space-y-4">
              {report.checks.map((c) => (
                <div key={c.id} className="space-y-1 border-t pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">{c.label}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">{c.detail}</p>
                </div>
              ))}
            </div>
          </Card>
        ) : busy ? (
          <Card className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking…
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
