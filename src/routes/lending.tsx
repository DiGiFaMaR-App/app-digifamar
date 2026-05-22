import { createFileRoute, Link } from "@tanstack/react-router";
import { Banknote, CheckCircle2 } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/lending")({
  head: () => ({
    meta: [
      { title: "Farm Lending Program | DiGiFaMaR" },
      { name: "description", content: "Turn verified sales into capital. After 30 sales, get pre-qualified for farm loans with our partner lenders." },
      { property: "og:url", content: "/lending" },
    ],
    links: [{ rel: "canonical", href: "/lending" }],
  }),
  component: Lending,
});

function Lending() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf-soft px-3 py-1 text-xs font-semibold text-primary">
          <Banknote className="h-3.5 w-3.5" /> Farm Lending Program
        </span>
        <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">Turn your sales into capital</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Every sale you make on DiGiFaMaR builds your reputation score. After 30 verified sales, you're automatically pre-qualified for farm loans from our partner lenders.
        </p>

        <ol className="mt-10 space-y-3">
          {[
            "Complete 30 verified sales",
            "Build your reputation score",
            "Get pre-qualified automatically",
            "Apply with one tap",
            "Receive funding in 48 hours",
          ].map((s, i) => (
            <li key={s} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span className="font-medium">{s}</span>
            </li>
          ))}
        </ol>

        <h2 className="mt-12 text-2xl font-bold">What you can fund</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {["Equipment financing", "Expansion capital", "Seasonal inventory", "Land improvement"].map((t) => (
            <div key={t} className="flex items-center gap-2 rounded-xl border border-border bg-card p-4">
              <CheckCircle2 className="h-5 w-5 text-primary" /> {t}
            </div>
          ))}
        </div>

        <div className="mt-10">
          <Button asChild size="lg">
            <Link to="/signup/farmer">Check my eligibility</Link>
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}
