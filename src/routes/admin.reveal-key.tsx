/**
 * TEMPORARY page — reveal LOVABLE_API_KEY for copying into GitHub Actions.
 * Delete this file + src/lib/admin/reveal-lovable-key.functions.ts after use.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AdminGate } from "@/components/AdminGate";
import { RequireAuth } from "@/components/RequireAuth";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { revealLovableApiKeyFn } from "@/lib/admin/reveal-lovable-key.functions";

export const Route = createFileRoute("/admin/reveal-key")({
  head: () => ({
    meta: [{ title: "Admin · Reveal Key — DiGiFaMaR" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <RequireAuth>
      <AdminGate>
        <Body />
      </AdminGate>
    </RequireAuth>
  ),
});

function Body() {
  const reveal = revealLovableApiKeyFn;
  const [value, setValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onReveal = async () => {
    setLoading(true);
    try {
      const res = await reveal();
      setValue(res.value);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard");
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl px-5 py-10 text-[#F0FFF0] space-y-4">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold">Reveal LOVABLE_API_KEY</h1>
          <p className="text-sm text-[#F0FFF0]/70">
            One-time use. Copy the value into your GitHub repo at{" "}
            <span className="font-mono">Settings → Secrets and variables → Actions</span>, then
            delete this page (<span className="font-mono">src/routes/admin.reveal-key.tsx</span>)
            and <span className="font-mono">src/lib/admin/reveal-lovable-key.functions.ts</span>.
          </p>
        </header>

        <Card className="space-y-3 p-4 bg-black/40 border-white/15">
          {!value ? (
            <Button onClick={onReveal} disabled={loading}>
              {loading ? "Revealing…" : "Reveal key"}
            </Button>
          ) : (
            <>
              <pre className="whitespace-pre-wrap break-all font-mono text-xs bg-black/60 p-3 rounded border border-white/10">
                {value}
              </pre>
              <div className="flex gap-2">
                <Button onClick={copy}>Copy</Button>
                <Button variant="outline" onClick={() => setValue(null)}>
                  Hide
                </Button>
              </div>
            </>
          )}
          <p className="text-xs text-amber-300/80">
            Every reveal is recorded in the admin audit log.
          </p>
        </Card>
      </div>
    </SiteLayout>
  );
}
