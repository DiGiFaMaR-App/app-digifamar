/**
 * Admin · Maps — status of the Lovable-managed Google Maps connection.
 * The browser key is provided by the Lovable connector; there is nothing to
 * configure here. The server-side Places health check remains available.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminGate } from "@/components/AdminGate";
import { RequireAuth } from "@/components/RequireAuth";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { resolveGoogleMapsKey } from "@/lib/gmaps-key";

export const Route = createFileRoute("/admin/maps")({
  head: () => ({
    meta: [{ title: "Admin · Maps — DiGiFaMaR" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <RequireAuth>
      <AdminGate>
        <MapsAdminBody />
      </AdminGate>
    </RequireAuth>
  ),
});

function mask(key: string | undefined | null) {
  if (!key) return "—";
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

function MapsAdminBody() {
  const [key, setKey] = useState<string | undefined>(undefined);
  const [health, setHealth] = useState<
    | { state: "idle" }
    | { state: "loading" }
    | {
        state: "healthy";
        place: {
          name: string | null;
          formattedAddress: string | null;
          lat: number | null;
          lng: number | null;
        };
      }
    | { state: "unhealthy"; status: string; error: string }
  >({ state: "idle" });

  useEffect(() => {
    resolveGoogleMapsKey().then(setKey);
  }, []);

  const checkHealth = async () => {
    setHealth({ state: "loading" });
    try {
      const res = await fetch("/api/public/health/maps");
      const payload = (await res.json()) as {
        status: string;
        ok: boolean;
        error?: string;
        place?: {
          name?: string | null;
          formattedAddress?: string | null;
          lat?: number | null;
          lng?: number | null;
        };
      };
      if (res.ok && payload.ok) {
        setHealth({
          state: "healthy",
          place: {
            name: payload.place?.name ?? null,
            formattedAddress: payload.place?.formattedAddress ?? null,
            lat: payload.place?.lat ?? null,
            lng: payload.place?.lng ?? null,
          },
        });
      } else {
        setHealth({
          state: "unhealthy",
          status: payload.status,
          error: payload.error ?? "Unknown error",
        });
      }
    } catch (e) {
      setHealth({
        state: "unhealthy",
        status: "degraded",
        error: e instanceof Error ? e.message : "Network or parse error",
      });
    }
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl px-5 py-10 text-[#F0FFF0] space-y-4">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold">Admin · Maps</h1>
          <p className="text-[#F0FFF0]/70 text-sm">
            Maps use the Lovable-managed Google Maps connection. There is no key to enter — it is
            injected at build time and works on Lovable domains.
          </p>
        </header>

        <Card className="space-y-3 p-4 bg-black/40 border-white/15">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#F0FFF0]/70">Browser key</span>
            <span className="font-mono">{mask(key)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#F0FFF0]/70">Source</span>
            <span>Lovable-managed connector</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#F0FFF0]/70">Status</span>
            <Badge variant={key ? "default" : "destructive"}>
              {key ? "Configured" : "Not available"}
            </Badge>
          </div>
        </Card>

        <Card className="space-y-3 p-4 bg-black/40 border-white/15">
          <div className="space-y-1">
            <h2 className="text-sm font-medium">Server-side health check</h2>
            <p className="text-xs text-[#F0FFF0]/60">
              Tests the server-side Maps credentials used by server functions (Places API details
              call).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={checkHealth} disabled={health.state === "loading"} variant="outline">
              {health.state === "loading" ? "Checking…" : "Test Places API"}
            </Button>
            {health.state === "healthy" && (
              <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/20 border-green-500/30">
                Healthy
              </Badge>
            )}
            {health.state === "unhealthy" && <Badge variant="destructive">{health.status}</Badge>}
          </div>
          {health.state === "healthy" && (
            <div className="text-sm space-y-1 rounded border border-white/10 bg-black/60 p-3">
              <p>
                <span className="text-[#F0FFF0]/60">Name:</span> {health.place.name ?? "—"}
              </p>
              <p>
                <span className="text-[#F0FFF0]/60">Address:</span>{" "}
                {health.place.formattedAddress ?? "—"}
              </p>
              <p>
                <span className="text-[#F0FFF0]/60">Lat / Lng:</span>{" "}
                {health.place.lat != null && health.place.lng != null
                  ? `${health.place.lat.toFixed(6)}, ${health.place.lng.toFixed(6)}`
                  : "—"}
              </p>
            </div>
          )}
          {health.state === "unhealthy" && (
            <div className="text-sm rounded border border-red-500/20 bg-red-500/10 p-3 text-red-200">
              {health.error}
            </div>
          )}
        </Card>
      </div>
    </SiteLayout>
  );
}
