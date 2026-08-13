import { createFileRoute } from "@tanstack/react-router";
import { Clock, Lock, RefreshCw, ShieldCheck } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/buyer-protection")({
  head: () => ({
    meta: [
      { title: "Buyer Protection & Escrow | DiGiFaMaR" },
      {
        name: "description",
        content:
          "Every DiGiFaMaR order is escrow-protected. Funds release only after you confirm delivery with your 6-digit code, and a 48-hour inspection window runs before any automatic release, subject to the applicable terms.",
      },
      { property: "og:url", content: "https://app.digifamar.com/buyer-protection" },
    ],
    links: [{ rel: "canonical", href: "https://app.digifamar.com/buyer-protection" }],
  }),
  component: Protection,
});

function Protection() {
  const items = [
    {
      icon: Lock,
      t: "Escrow at checkout",
      b: "Card payments are held safely until your order arrives. The farmer is never paid before you confirm.",
    },
    {
      icon: ShieldCheck,
      t: "6-digit confirmation",
      b: "You confirm delivery in the app. We text the farmer a single-use release code to receive funds.",
    },
    {
      icon: RefreshCw,
      t: "48-hour inspection window",
      b: "Something wrong? Open a dispute during the inspection window. Escrow release is paused while the claim is reviewed and resolved by our team, subject to the applicable terms.",
    },
    {
      icon: Clock,
      t: "Real-time tracking",
      b: "Track every order from farm prep through delivery, with proactive SMS updates at each step.",
    },
  ];
  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h1 className="text-4xl font-extrabold sm:text-5xl">Buyer protection</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Every DiGiFaMaR order is protected end-to-end.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {items.map((i) => (
            <div key={i.t} className="rounded-2xl border border-border bg-card p-6">
              <i.icon className="h-7 w-7 text-primary" />
              <h2 className="mt-4 text-xl font-bold">{i.t}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{i.b}</p>
            </div>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}
