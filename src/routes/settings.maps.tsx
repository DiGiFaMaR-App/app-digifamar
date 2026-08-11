import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminGate } from "@/components/AdminGate";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  getAppSettingFn,
  setAppSettingFn,
  clearAppSettingFn,
} from "@/lib/admin/app-settings.functions";
import { invalidateGoogleMapsKeyCache, resolveGoogleMapsKey } from "@/lib/gmaps-key";
import { invalidateGoogleMapsLoader } from "@/hooks/use-google-maps";
import {
  MAP_ENVIRONMENTS,
  MAP_ENVIRONMENT_LABELS,
  browserKeyName,
  currentMapEnvironment,
  serverKeyName,
  type MapEnvironment,
} from "@/lib/maps/env";

export const Route = createFileRoute("/settings/maps")({
  head: () => ({
    meta: [
      { title: "Google Maps API Keys — DiGiFaMaR" },
      {
        name: "description",
        content:
          "Save your own Google Maps browser and server geocoding API keys for each environment.",
      },
      { property: "og:title", content: "Google Maps API Keys — DiGiFaMaR" },
      {
        property: "og:description",
        content: "Manage the Google Maps keys DiGiFaMaR uses for maps and geocoding.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AdminGate>
        <MapsSettingsPage />
      </AdminGate>
    </RequireAuth>
  ),
});

function mask(key: string | undefined | null) {
  if (!key) return "—";
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

type KeyKind = "browser" | "server";

function KeyField({
  env,
  kind,
  onSaved,
}: {
  env: MapEnvironment;
  kind: KeyKind;
  onSaved: () => void;
}) {
  const settingKey = kind === "browser" ? browserKeyName(env) : serverKeyName(env);
  const [saved, setSaved] = useState<{ value: string; updated_at: string } | null>(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    getAppSettingFn({ data: { key: settingKey } })
      .then((row) =>
        setSaved(row?.value ? { value: row.value, updated_at: row.updated_at } : null),
      )
      .catch(() => setSaved(null));
  }, [settingKey]);

  useEffect(load, [load]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await setAppSettingFn({ data: { key: settingKey, value } });
      setValue("");
      load();
      invalidateGoogleMapsKeyCache();
      invalidateGoogleMapsLoader();
      onSaved();
      toast.success(`${kind === "browser" ? "Browser" : "Server"} key saved`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not save the key";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await clearAppSettingFn({ data: { key: settingKey } });
      load();
      invalidateGoogleMapsKeyCache();
      invalidateGoogleMapsLoader();
      onSaved();
      toast.success("Key removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove the key");
    } finally {
      setBusy(false);
    }
  };

  const inputId = `${settingKey}-input`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={inputId} className="text-sm font-medium">
          {kind === "browser" ? "Browser key (maps & autocomplete)" : "Server key (geocoding)"}
        </Label>
        <span className="font-mono text-xs text-muted-foreground">{mask(saved?.value)}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {kind === "browser"
          ? "Restrict this key by HTTP referrer to the domains used by this environment."
          : "Use an unrestricted (or IP-restricted) key — referrer restrictions break server calls."}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={inputId}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="AIza…"
          autoComplete="off"
          spellCheck={false}
          type="password"
        />
        <div className="flex gap-2">
          <Button onClick={save} disabled={busy || value.trim().length === 0}>
            Save
          </Button>
          {saved && (
            <Button variant="outline" onClick={remove} disabled={busy}>
              Remove
            </Button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {saved && (
        <p className="text-xs text-muted-foreground">
          Last updated {new Date(saved.updated_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}

function MapsSettingsPage() {
  const [hostname, setHostname] = useState("");
  const [activeKey, setActiveKey] = useState<string | undefined>(undefined);
  const [loadStatus, setLoadStatus] = useState<"checking" | "ok" | "blocked" | "no-key">(
    "checking",
  );
  const [reload, setReload] = useState(0);
  const [env, setEnv] = useState<MapEnvironment>("production");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHostname(window.location.hostname);
    setEnv(currentMapEnvironment());
  }, []);

  useEffect(() => {
    resolveGoogleMapsKey().then(setActiveKey);
  }, [reload]);

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

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Google Maps API keys</h1>
          <p className="text-sm text-muted-foreground">
            Paste your own Google Maps keys and save them per environment. Saved keys take
            priority over the Lovable-managed key.
          </p>
          <Link to="/settings/map-keys" className="text-sm font-medium underline underline-offset-4">
            Check key status →
          </Link>
        </header>

        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current domain</span>
            <span className="font-mono text-sm">{hostname || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">This environment</span>
            <Badge variant="secondary">{MAP_ENVIRONMENT_LABELS[currentMapEnvironment()]}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Active browser key</span>
            <span className="font-mono text-sm">{mask(activeKey)}</span>
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
              {loadStatus === "no-key" && "No key available"}
            </Badge>
          </div>
        </Card>

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

        <Card className="space-y-6 p-4">
          <KeyField env={env} kind="browser" onSaved={() => setReload((n) => n + 1)} />
          <KeyField env={env} kind="server" onSaved={() => setReload((n) => n + 1)} />
        </Card>

        <Card className="space-y-2 p-4">
          <p className="text-sm font-medium">Setting up a key in Google Cloud</p>
          <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
            <li>Enable Maps JavaScript API, Places API (New) and Geocoding API on your project.</li>
            <li>
              For the browser key, add referrers such as{" "}
              <span className="font-mono">https://{hostname || "your-domain.com"}/*</span> and{" "}
              <span className="font-mono">https://*.digifamar.com/*</span>.
            </li>
            <li>Keep the server key without referrer restrictions so geocoding calls succeed.</li>
          </ol>
        </Card>
      </div>
    </AppShell>
  );
}
