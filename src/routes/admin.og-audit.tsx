/**
 * Admin · OG audit — inspect the exact Open Graph / Twitter card metadata
 * (and rendered preview) for any route, so you can confirm every share card
 * embeds the latest logo and correct listing details.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { RequireAuth } from "@/components/RequireAuth";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { auditOgTagsFn } from "@/lib/seo/og-audit.functions";
import { DEFAULT_AUDIT_PATHS, tagValue, type OgAuditResult } from "@/lib/seo/og-audit";
import { farms, products } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/og-audit")({
  head: () => ({
    meta: [{ title: "Admin · OG audit — DiGiFaMaR" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <RequireAuth>
      <AdminGate>
        <OgAuditPage />
      </AdminGate>
    </RequireAuth>
  ),
});

const ALL_LISTING_PATHS = [
  ...DEFAULT_AUDIT_PATHS,
  ...farms.map((f) => `/farm/${f.id}`),
  ...products.map((p) => `/product/${p.id}`),
];

function OgAuditPage() {
  const audit = useServerFn(auditOgTagsFn);
  const [input, setInput] = useState(DEFAULT_AUDIT_PATHS.join("\n"));
  const [results, setResults] = useState<OgAuditResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paths = useMemo(
    () =>
      input
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 25),
    [input],
  );

  const run = async (list = paths) => {
    setLoading(true);
    setError(null);
    try {
      setResults(await audit({ data: { paths: list } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Audit failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold">Social card audit</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Fetches each route server-side and shows its exact OG / Twitter metadata, plus the image
          it resolves to. Cards must be 1200×630 and served over absolute https URLs.
        </p>

        <Card className="mt-6 p-4">
          <label htmlFor="og-paths" className="text-sm font-semibold">
            Routes to check (one per line, max 25)
          </label>
          <Textarea
            id="og-paths"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={6}
            className="mt-2 font-mono text-xs"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => run()} disabled={loading || !paths.length}>
              {loading ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-4 w-4" />
              )}
              Run audit
            </Button>
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => {
                const list = ALL_LISTING_PATHS.slice(0, 25);
                setInput(list.join("\n"));
                void run(list);
              }}
            >
              Load every farm & product
            </Button>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </Card>

        <div className="mt-8 space-y-6">
          {results?.map((r) => (
            <ResultCard key={r.path} result={r} />
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}

function ResultCard({ result }: { result: OgAuditResult }) {
  const ok = result.problems.length === 0;
  const title = tagValue(result.tags, "og:title") ?? result.title ?? result.path;
  const desc = tagValue(result.tags, "og:description") ?? tagValue(result.tags, "description");

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
        <div className="flex items-center gap-2">
          {ok ? (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-destructive" />
          )}
          <code className="text-sm font-semibold">{result.path}</code>
          <span className="text-xs text-muted-foreground">HTTP {result.status}</span>
        </div>
        {result.image?.width && (
          <span className="text-xs text-muted-foreground">
            {result.image.width}×{result.image.height} · {result.image.contentType}
          </span>
        )}
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Preview
          </p>
          <div className="mt-2 overflow-hidden rounded-xl border border-border">
            {result.image?.url ? (
              <img
                src={result.image.url}
                alt={`Social card for ${result.path}`}
                width={1200}
                height={630}
                loading="lazy"
                className="aspect-[1200/630] w-full object-cover"
              />
            ) : (
              <div className="grid aspect-[1200/630] place-items-center bg-muted text-xs text-muted-foreground">
                No og:image
              </div>
            )}
            <div className="p-3">
              <p className="text-sm font-semibold">{title}</p>
              {desc && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{desc}</p>}
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tags
          </p>
          <dl className="mt-2 space-y-1 text-xs">
            <div className="flex gap-2">
              <dt className="w-40 shrink-0 font-mono text-muted-foreground">title</dt>
              <dd className="break-all">{result.title ?? "—"}</dd>
            </div>
            {result.tags.map((t) => (
              <div key={t.key + t.value} className="flex gap-2">
                <dt className="w-40 shrink-0 font-mono text-muted-foreground">{t.key}</dt>
                <dd className="break-all">{t.value}</dd>
              </div>
            ))}
          </dl>

          {!ok && (
            <ul className="mt-3 space-y-1 text-xs text-destructive" role="alert">
              {result.problems.map((p) => (
                <li key={p}>• {p}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}
