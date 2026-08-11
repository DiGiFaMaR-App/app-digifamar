import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminGate } from "@/components/AdminGate";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { checkMapKeyHealthFn, type KeyCheck, type KeyHealth } from "@/lib/maps/key-health.functions";
import {
  MAP_ENVIRONMENTS,
  MAP_ENVIRONMENT_LABELS,
  currentMapEnvironment,
  type MapEnvironment,
} from "@/lib/maps/env";

export const Route = createFileRoute("/settings/map-keys")({
  head: () => ({
    meta: [
      { title: "Map key status — DiGiFaMaR" },
      {
        name: "description",
        content:
          "Check whether the Google Maps browser key and server geocoding key are valid for each environment.",
      },
      { property: "og:title", content: "Map key status — DiGiFaMaR" },
      {
        property: "og:description",
        content: "Live validation of the Google Maps browser and geocoding keys used by DiGiFaMaR.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AdminGate>
        <MapKeyStatusPage />
      </AdminGate>
    </RequireAuth>
  ),
});

function StatusBadge({ status }: { status: KeyCheck["status"] }) {
  const label =
    status === "valid" ? "Valid" : status === "invalid" ? "Not working" : "Not configured";
  return (
    <Badge variant={status === "valid" ? "default" : status === "invalid" ? "destructive" : "secondary"}>
      {label}
    </Badge>
  );
}

function CheckRow({ title, hint, check }: { title: string; hint: string; check: KeyCheck }) {
  return (
    <div className="space-y-1 border-t pt-4 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{title}</span>
        <StatusBadge status={check.status} />
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-mono">{check.masked ?? "—"}</span>
        <span className="text-muted-foreground">
          {check.source === "saved"
            ? "saved in settings"
            : check.source === "fallback"
              ? "build-time fallback key"
              : "no key"}
        </span>
      </div>
      <p className="text-xs text-muted-foreground break-words">{check.detail}</p>
    </div>
  );
}

function MapKeyStatusPage() {
  const [env, setEnv] = useState<MapEnvironment>("production");
  const [health, setHealth] = useState<KeyHealth | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEnv(currentMapEnvironment());
  }, []);

  const run = useCallback(
    async (target: MapEnvironment) => {
      setBusy(true);
      setError(null);
      try {
        const referrer =
          typeof window !== "undefined" && target === currentMapEnvironment()
            ? `${window.location.origin}/`
            : undefined;
        setHealth(await checkMapKeyHealthFn({ data: { env: target, referrer } }));
      } catch (e) {
        setHealth(null);
        setError(e instanceof Error ? e.message : "Could not check the keys");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  useEffect(() => {
    void run(env);
  }, [env, run]);

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Map key status</h1>
          <p className="text-sm text-muted-foreground">
            Live check of the Google Maps browser key and the server geocoding key for each
            environment.
          </p>
        </header>

        <div
          role="tablist"
          aria-label="Environment"
          className="inline-flex rounded-xl border bg-muted/40 p-1"
        >
          {MAP_ENVIRONMENTS.map((e) => (
            <button
              key={e}
              role="tab"
              type="button"
              aria-selected={env === e}
              onClick={() => setEnv(e)}
              className={`min-h-11 rounded-lg px-4 text-sm font-medium transition-colors ${
                env === e ? "bg-background shadow-soft" : "text-muted-foreground"
              }`}
            >
              {MAP_ENVIRONMENT_LABELS[e]}
            </button>
          ))}
        </div>

        <Card className="space-y-4 p-4">
          {busy && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Checking keys…
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {health && !busy && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tested referrer</span>
                <span className="font-mono text-xs">{health.referrer}</span>
              </div>
              <CheckRow
                title="Browser key (maps & autocomplete)"
                hint="Must allow this environment's domain as an HTTP referrer."
                check={health.browser}
              />
              <CheckRow
                title="Server key (geocoding)"
                hint="Must be unrestricted or IP-restricted — referrer limits break server calls."
                check={health.server}
              />
            </>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" onClick={() => run(env)} disabled={busy}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden /> Re-check
            </Button>
            <Button asChild variant="ghost">
              <Link to="/settings/maps">Manage keys</Link>
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
