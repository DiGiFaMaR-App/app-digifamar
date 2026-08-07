import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { resolveGoogleMapsKey } from "@/lib/gmaps-key";

export const Route = createFileRoute("/settings/maps")({
  head: () => ({
    meta: [
      { title: "Maps Platform Settings — DiGiFaMaR" },
      {
        name: "description",
        content: "Status of the Lovable-managed Google Maps key used on this domain.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MapsSettingsPage,
});

function mask(key: string | undefined | null) {
  if (!key) return "—";
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

function MapsSettingsPage() {
  const [hostname, setHostname] = useState("");
  const [activeKey, setActiveKey] = useState<string | undefined>(undefined);
  const [loadStatus, setLoadStatus] = useState<"checking" | "ok" | "blocked" | "no-key">(
    "checking",
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHostname(window.location.hostname);
    resolveGoogleMapsKey().then(setActiveKey);
  }, []);

  useEffect(() => {
    if (activeKey === undefined) return;
    if (!activeKey) {
      setLoadStatus("no-key");
      return;
    }
    setLoadStatus("checking");
    const img = new Image();
    img.onload = () => setLoadStatus("ok");
    img.onerror = () => setLoadStatus("blocked");
    img.src = `https://maps.googleapis.com/maps/api/staticmap?center=0,0&zoom=1&size=1x1&key=${encodeURIComponent(
      activeKey,
    )}`;
  }, [activeKey]);

  const isCustomDomain =
    hostname &&
    !hostname.endsWith(".lovable.app") &&
    !hostname.endsWith(".lovableproject.com") &&
    hostname !== "localhost";

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Maps Platform</h1>
          <p className="text-sm text-muted-foreground">
            Maps run on the Lovable-managed Google Maps connection. No key setup is needed.
          </p>
        </header>

        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current domain</span>
            <span className="font-mono text-sm">{hostname || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Domain type</span>
            <Badge variant={isCustomDomain ? "default" : "secondary"}>
              {isCustomDomain ? "Custom domain" : "Lovable domain"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Active key</span>
            <span className="font-mono text-sm">{mask(activeKey)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Source</span>
            <Badge variant="secondary">Managed by Lovable</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge
              variant={
                loadStatus === "ok"
                  ? "default"
                  : loadStatus === "checking"
                    ? "secondary"
                    : "destructive"
              }
            >
              {loadStatus === "ok" && "Working on this domain"}
              {loadStatus === "checking" && "Checking…"}
              {loadStatus === "blocked" && "Blocked — referrer not allowed"}
              {loadStatus === "no-key" && "No managed key available"}
            </Badge>
          </div>
        </Card>

        {isCustomDomain && (
          <Card className="space-y-2 p-4">
            <p className="text-sm font-medium">Heads up about custom domains</p>
            <p className="text-xs text-muted-foreground">
              The Lovable-managed Maps key is referrer-restricted to{" "}
              <span className="font-mono">*.lovable.app</span> and{" "}
              <span className="font-mono">*.lovableproject.com</span>, so maps on{" "}
              <span className="font-mono">{hostname}</span> will be blocked. To serve maps here,
              connect your own Google Maps API key through Lovable's connector settings.
            </p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
