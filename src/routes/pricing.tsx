import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Farmer pricing plans | DiGiFaMaR" },
      { name: "description", content: "Free, Pro, and Elite plans. Keep more of every sale, get featured placement, and access farm lending." },
      { property: "og:title", content: "Farmer pricing plans | DiGiFaMaR" },
      { property: "og:description", content: "Free, Pro, and Elite plans for American farmers." },
      { property: "og:url", content: "https://farmer-forward.lovable.app/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://farmer-forward.lovable.app/pricing" }],
  }),
  component: Pricing,
});

const tiers = [
  {
    name: "Free",
    price: "$0",
    note: "/month",
    fee: "15% platform fee",
    features: [
      "5 active listings",
      "Standard search placement",
      "Basic analytics",
      "Email support",
    ],
  },
  {
    name: "Pro",
    price: "$29",
    note: "/month",
    fee: "10% platform fee",
    highlight: true,
    features: [
      "25 active listings",
      "Featured search placement",
      "Full analytics dashboard",
      "Priority support",
      "Verified badge",
      "Bulk listing tools",
    ],
  },
  {
    name: "Elite",
    price: "$79",
    note: "/month",
    fee: "8% platform fee",
    features: [
      "Unlimited listings",
      "Top search placement",
      "Advanced AI analytics",
      "Dedicated support",
      "Elite farmer badge",
      "Early lending access",
      "Custom farm page",
    ],
  },
];

function Pricing() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-extrabold sm:text-5xl">Farmer pricing</h1>
          <p className="mt-3 text-muted-foreground">
            Transparent fees. No hidden costs. Cancel anytime.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`card-lift relative flex flex-col rounded-2xl border bg-card p-6 ${
                t.highlight ? "border-primary ring-2 ring-primary/30" : "border-border"
              }`}
            >
              {t.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-secondary px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-secondary-foreground">
                  Most popular
                </span>
              )}
              <h3 className="text-xl font-bold">{t.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">{t.price}</span>
                <span className="text-muted-foreground">{t.note}</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-primary">{t.fee}</p>
              <ul className="mt-6 flex-1 space-y-2 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button asChild className={`mt-6 w-full ${t.highlight ? "" : "bg-card text-foreground border border-border hover:bg-muted"}`}>
                <Link to="/signup/farmer">Choose {t.name}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}
