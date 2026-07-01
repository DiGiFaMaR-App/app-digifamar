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
          "Every DiGiFaMaR order is escrow-protected. Funds release only after you confirm delivery, with a 72-hour refund guarantee.",
      },
      { property: "og:url", content: "/buyer-protection" },
    ],
    links: [{ rel: "canonical", href: "/buyer-protection" }],
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
      t: "72-hour refund window",
      b: "Something wrong? Open a dispute within 72 hours of delivery for an automatic refund and review.",
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
