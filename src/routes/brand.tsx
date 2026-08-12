import { createFileRoute } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Logo } from "@/components/Logo";
import { BRAND, BRAND_COLORS } from "@/lib/brand";

export const Route = createFileRoute("/brand")({
  head: () => ({
    meta: [
      { title: "Brand style guide — DiGiFaMaR" },
      {
        name: "description",
        content:
          "How to use the DiGiFaMaR logo: clear space, minimum sizes, colour tokens, dark mode variants and misuse examples.",
      },
      { property: "og:title", content: "Brand style guide — DiGiFaMaR" },
      {
        property: "og:description",
        content: "Logo usage, spacing, colour tokens and dark mode variants for DiGiFaMaR.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://app.digifamar.com/brand" },
      { property: "og:image", content: BRAND.og.default },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: BRAND.og.default },
    ],
    links: [{ rel: "canonical", href: "https://app.digifamar.com/brand" }],
  }),
  component: BrandGuide,
});

function Section({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border pt-10">
      <h2 className="font-display text-2xl font-bold tracking-tight">{title}</h2>
      {lead ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{lead}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 text-sm">
      <span
        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          ok ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
        }`}
        aria-hidden
      >
        {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      </span>
      <span className="text-muted-foreground">{children}</span>
    </li>
  );
}

function BrandGuide() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Brand style guide
        </p>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          The DiGiFaMaR mark
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          One logo, used consistently. This page documents clear space, minimum sizes, colour
          tokens and dark mode variants so every surface — web, app icon, email, social card —
          looks like the same company.
        </p>

        <div className="mt-12 space-y-12">
          <Section
            id="logo"
            title="Primary logo"
            lead="The mark already contains the DiGiFaMaR wordmark. Never re-typeset the name next to it."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex min-h-48 items-center justify-center rounded-2xl border border-border bg-card p-8">
                <Logo size="lg" linked={false} />
              </div>
              <div
                className="flex min-h-48 items-center justify-center rounded-2xl p-8"
                style={{ backgroundColor: "#0F2C1A" }}
              >
                <Logo size="lg" linked={false} />
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              On dark surfaces the mark keeps its white plate — that plate <em>is</em> the dark
              mode variant. Do not knock the logo out to a flat white silhouette.
            </p>
          </Section>

          <Section
            id="spacing"
            title="Clear space & minimum size"
            lead="Clear space equals half the height of the mark on every side. Nothing — text, icons, image edges — enters that zone."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="relative mx-auto w-fit">
                  <div className="rounded-xl border-2 border-dashed border-accent p-8">
                    <Logo size="md" linked={false} />
                  </div>
                  <span className="mt-2 block text-center text-[11px] uppercase tracking-widest text-muted-foreground">
                    clear space = ½ logo height
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-end justify-center gap-6">
                  {(["sm", "md", "lg"] as const).map((s) => (
                    <div key={s} className="text-center">
                      <Logo size={s} linked={false} />
                      <p className="mt-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                        {s}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Minimum sizes: 24&nbsp;px tall on screen, 32&nbsp;px for the app icon plate,
                  10&nbsp;mm in print.
                </p>
              </div>
            </div>
          </Section>

          <Section id="colors" title="Colour tokens" lead="Always reference the token, never a raw hex, in product code.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {BRAND_COLORS.map((c) => (
                <div key={c.name} className="overflow-hidden rounded-2xl border border-border bg-card">
                  <div className="h-20 w-full" style={{ backgroundColor: c.hex }} />
                  <div className="p-4">
                    <p className="text-sm font-semibold">{c.name}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {c.hex} · var({c.token})
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">{c.use}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section
            id="dark"
            title="Dark mode & surfaces"
            lead="Forest is the dark surface. Text goes to cream, accents to sage — never pure #000 or pure #FFF blocks."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-6">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Light</p>
                <p className="mt-2 font-display text-xl font-bold">From American farms</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ink on canvas, sage for quiet emphasis.
                </p>
                <button className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                  Primary action
                </button>
              </div>
              <div className="rounded-2xl p-6" style={{ backgroundColor: "#0F2C1A" }}>
                <p className="text-xs uppercase tracking-widest" style={{ color: "#9AB79E" }}>
                  Dark
                </p>
                <p className="mt-2 font-display text-xl font-bold" style={{ color: "#F5F7F3" }}>
                  From American farms
                </p>
                <p className="mt-1 text-sm" style={{ color: "#9AB79E" }}>
                  Cream on forest, sage for quiet emphasis.
                </p>
                <button
                  className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold"
                  style={{ backgroundColor: "#F5F7F3", color: "#0F2C1A" }}
                >
                  Primary action
                </button>
              </div>
            </div>
          </Section>

          <Section id="usage" title="Do & don't">
            <div className="grid gap-6 sm:grid-cols-2">
              <ul className="space-y-3">
                <Rule ok>Keep the white plate under the mark on photos and dark surfaces.</Rule>
                <Rule ok>Scale proportionally; the mark is always square.</Rule>
                <Rule ok>Use the app icon exports for launcher, favicon and social profiles.</Rule>
                <Rule ok>Pair with Plus Jakarta Sans (display) and Inter (body).</Rule>
              </ul>
              <ul className="space-y-3">
                <Rule ok={false}>Don't recolour, outline or add drop shadows to the mark.</Rule>
                <Rule ok={false}>Don't stretch, rotate or crop it.</Rule>
                <Rule ok={false}>Don't set the wordmark in type next to the logo.</Rule>
                <Rule ok={false}>Don't place it on low-contrast or busy imagery without the plate.</Rule>
              </ul>
            </div>
          </Section>

          <Section
            id="assets"
            title="Asset downloads"
            lead="The same source mark drives every export below."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Primary logo (PNG, 1408px)", href: BRAND.logoUrl },
                { label: "Favicon (96px)", href: "/favicon.png" },
                { label: "Apple touch icon (180px)", href: "/apple-touch-icon.png" },
                { label: "App icon (512px, maskable)", href: "/icon-512.png" },
                { label: "Social card — default (1200×630)", href: BRAND.og.default },
                { label: "Social card — marketplace", href: BRAND.og.market },
              ].map((a) => (
                <a
                  key={a.label}
                  href={a.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium hover:border-primary/40"
                >
                  {a.label}
                </a>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </SiteLayout>
  );
}
