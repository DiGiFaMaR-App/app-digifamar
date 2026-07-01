import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, ShieldCheck, Truck } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How DiGiFaMaR works" },
      {
        name: "description",
        content:
          "From browsing verified farms to confirming delivery with a 6-digit code — here's how DiGiFaMaR works end to end.",
      },
      { property: "og:url", content: "/how-it-works" },
    ],
    links: [{ rel: "canonical", href: "/how-it-works" }],
  }),
  component: HowItWorks,
});

function HowItWorks() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-4xl font-extrabold sm:text-5xl">How DiGiFaMaR works</h1>
        <p className="mt-3 text-muted-foreground">
          A direct connection between buyer and farmer, secured by escrow.
        </p>

        {[
          {
            icon: MapPin,
            n: 1,
            t: "Find local farms",
            b: "Search by city, state, or zip. Filter by category, distance, certifications, and delivery speed.",
          },
          {
            icon: ShieldCheck,
            n: 2,
            t: "Order with escrow protection",
            b: "Pay with card or Apple/Google Pay. Funds are held safely until you confirm delivery.",
          },
          {
            icon: Truck,
            n: 3,
            t: "Receive farm fresh",
            b: "24-hour local or 48-hour nationwide. Confirm with a 6-digit code and your farmer is paid same day.",
          },
        ].map((s) => (
          <div key={s.n} className="mt-8 flex gap-4 rounded-2xl border border-border bg-card p-6">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <s.icon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">Step {s.n}</p>
              <h2 className="text-xl font-bold">{s.t}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{s.b}</p>
            </div>
          </div>
        ))}

        <div className="mt-10 flex gap-3">
          <Button asChild>
            <Link to="/browse">Start shopping</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/signup/farmer">Become a farmer</Link>
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}
