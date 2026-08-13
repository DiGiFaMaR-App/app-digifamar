import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Banknote,
  HandCoins,
  LineChart,
  ShieldCheck,
  Sprout,
  Truck,
  Users,
} from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { WaitlistBanner } from "@/components/lenders/WaitlistBanner";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/lenders/")({
  head: () => ({
    meta: [
      { title: "Lending Program for Farmers & Lenders | DiGiFaMaR" },
      {
        name: "description",
        content:
          "A working-capital lending program for verified DiGiFaMaR farms, backed by real delivery and performance data. Join the lender or farmer waitlist.",
      },
      { property: "og:title", content: "DiGiFaMaR Lending — Join the Waitlist" },
      {
        property: "og:description",
        content:
          "Working-capital loans for verified farmers, funded by lenders, informed by marketplace delivery data. Not live yet — join the waitlist.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://app.digifamar.com/lenders" },
      { property: "og:image", content: BRAND.og.lenders },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: BRAND.og.lenders },
    ],
    links: [{ rel: "canonical", href: "https://app.digifamar.com/lenders" }],
  }),
  component: LendersLanding,
});

const HOW_IT_WORKS: { icon: typeof Sprout; title: string; body: string }[] = [
  {
    icon: Sprout,
    title: "1 · Farmers express interest",
    body: "A verified farm tells us the working-capital range it needs and what it's for. No documents, no credit pull.",
  },
  {
    icon: BarChart3,
    title: "2 · Marketplace data provides context",
    body: "Completed orders, on-time delivery and buyer ratings already live on DiGiFaMaR give lenders a performance picture no bank statement shows.",
  },
  {
    icon: HandCoins,
    title: "3 · Lenders review opportunities",
    body: "Prospective lenders see anonymized farm performance and indicate the loan sizes and regions they'd like to serve.",
  },
  {
    icon: Truck,
    title: "4 · Repayment follows the harvest",
    body: "The intended design ties repayment to marketplace sales cycles rather than a fixed calendar. Terms are still being finalized.",
  },
];

const FARMER_BENEFITS = [
  "Working capital sized to your real sales history, not just collateral",
  "Fund seed, feed, equipment repairs, packaging and seasonal labor",
  "Your delivery record on DiGiFaMaR becomes an asset you already own",
  "One place for selling, getting paid, and requesting capital",
];

const LENDER_BENEFITS = [
  "Verified borrowers with continuous, auditable transaction history",
  "Performance signals from real deliveries, not self-reported figures",
  "Choose regions, farm types, and loan sizes that fit your mandate",
  "Portfolio visibility built directly on the marketplace ledger",
];

function LendersLanding() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf-soft px-3 py-1 text-xs font-semibold text-primary">
          <Banknote className="h-3.5 w-3.5" /> DiGiFaMaR Lending
        </span>
        <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
          Working capital for verified farms, backed by real marketplace performance
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          We're designing a lending program that connects farms already selling on DiGiFaMaR with
          lenders who want dependable, data-backed agricultural exposure. This page collects
          interest from both sides while the legal and lending structure is finalized.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/lenders/apply">
              Apply to become a lender <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/lenders/demo">Preview the lender dashboard</Link>
          </Button>
        </div>

        <WaitlistBanner className="mt-8" />

        {/* What it is */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold">What it is</h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            DiGiFaMaR already handles listings, escrow-protected orders, delivery confirmation and
            payouts for independent farms. The lending program is the natural next layer: short-term
            working capital for farms with a proven record on the platform, funded by third-party
            lenders rather than by DiGiFaMaR itself.
          </p>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Nothing here originates a loan, moves money, prices interest, or makes a credit
            decision. It is a waitlist for a product we intend to launch once the lending structure
            is in place.
          </p>
        </section>

        {/* How it will work */}
        <section className="mt-14">
          <h2 className="text-2xl font-bold">How it will work</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.title} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-leaf-soft">
                  <step.icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <p className="mt-3 font-semibold">{step.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section className="mt-14 grid gap-6 md:grid-cols-2">
          <div className="min-w-0 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <Sprout className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Why farmers benefit</h2>
            </div>
            <ul className="mt-4 space-y-2.5">
              {FARMER_BENEFITS.map((b) => (
                <li key={b} className="flex gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" className="mt-5 h-auto min-h-11 w-full whitespace-normal text-center sm:w-auto">
              <Link to="/dashboard/farmer">Express interest from your dashboard</Link>
            </Button>
          </div>

          <div className="min-w-0 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Why lenders benefit</h2>
            </div>
            <ul className="mt-4 space-y-2.5">
              {LENDER_BENEFITS.map((b) => (
                <li key={b} className="flex gap-2 text-sm text-muted-foreground">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Button asChild className="mt-5 h-auto min-h-11 w-full whitespace-normal text-center sm:w-auto">
              <Link to="/lenders/apply">Join the lender waitlist</Link>
            </Button>
          </div>
        </section>

        <section className="mt-14 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-xl font-bold">Where funding would eventually happen</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Loan offers, disbursement, repayment schedules and lender payouts are all part of a
            future release. Until then, every screen in this section is either a waitlist form or a
            clearly labeled sample preview.
          </p>
          <WaitlistBanner className="mt-4" title="Coming Soon — Waitlist">
            No capital is being accepted or committed. Joining the waitlist creates no obligation
            for you or for DiGiFaMaR.
          </WaitlistBanner>
        </section>
      </div>
    </SiteLayout>
  );
}
