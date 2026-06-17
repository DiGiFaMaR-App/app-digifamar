/**
 * Admin · Maps — view and update the default Google Maps browser API key
 * used by every visitor. Role-gated client-side for UX; the server function
 * re-checks the admin role before persisting.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminGate } from "@/components/AdminGate";
import { RequireAuth } from "@/components/RequireAuth";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getAppSettingFn,
  setAppSettingFn,
} from "@/lib/admin/app-settings.functions";
import { invalidateGoogleMapsKeyCache } from "@/lib/gmaps-key";

export const Route = createFileRoute("/admin/maps")({
  head: () => ({
    meta: [
      { title: "Admin · Maps — DiGiFaMaR" },
      { name: "robots", content: "noindex" },
    ],
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
  const getSetting = useServerFn(getAppSettingFn);
  const setSetting = useServerFn(setAppSettingFn);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["app_settings", "gmaps_browser_key"],
    queryFn: () => getSetting({ data: { key: "gmaps_browser_key" } }),
  });

  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.value) setDraft(data.value);
  }, [data?.value]);

  const save = async () => {
    const v = draft.trim();
    if (!/^AIza[0-9A-Za-z_-]{20,}$/.test(v)) {
      toast.error("Not a valid Google API key (should start with AIza…)");
      return;
    }
    setSaving(true);
    try {
      await setSetting({ data: { key: "gmaps_browser_key", value: v } });
      invalidateGoogleMapsKeyCache();
      toast.success("Saved. New key is live for every visitor on next map load.");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl px-5 py-10 text-[#F0FFF0] space-y-4">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold">Admin · Maps</h1>
          <p className="text-[#F0FFF0]/70 text-sm">
            The default Google Maps API key used by every visitor. Updates take
            effect on the next map load (no deploy needed).
          </p>
        </header>

        <Card className="space-y-3 p-4 bg-black/40 border-white/15">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#F0FFF0]/70">Current key</span>
            <span className="font-mono">{mask(data?.value)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#F0FFF0]/70">Last updated</span>
            <span>
              {data?.updated_at
                ? new Date(data.updated_at).toLocaleString()
                : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#F0FFF0]/70">Status</span>
            <Badge variant={data?.value ? "default" : "destructive"}>
              {isLoading ? "Loading…" : data?.value ? "Configured" : "Not set"}
            </Badge>
          </div>
        </Card>

        <Card className="space-y-3 p-4 bg-black/40 border-white/15">
          <div className="space-y-1">
            <Label htmlFor="gmaps-key">Google Maps API key</Label>
            <p className="text-xs text-[#F0FFF0]/60">
              Paste the key from your Google Cloud project. Make sure its HTTP
              referrer allowlist includes{" "}
              <span className="font-mono">https://app.digifamar.com/*</span> and{" "}
              <span className="font-mono">https://*.digifamar.com/*</span>.
            </p>
          </div>
          <Input
            id="gmaps-key"
            type="text"
            autoComplete="off"
            placeholder="AIza…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="font-mono bg-black/40 border-white/15"
          />
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving || !draft.trim()}>
              {saving ? "Saving…" : "Save key"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setDraft(data?.value ?? "")}
              disabled={saving}
            >
              Reset
            </Button>
          </div>
        </Card>
      </div>
    </SiteLayout>
  );
}
