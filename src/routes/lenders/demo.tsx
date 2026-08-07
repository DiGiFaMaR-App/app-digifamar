import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Banknote, PiggyBank, Sprout, Wallet } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SiteLayout } from "@/components/SiteLayout";
import { WaitlistBanner } from "@/components/lenders/WaitlistBanner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/lenders/demo")({
  head: () => ({
    meta: [
      { title: "Lender Dashboard Preview (Sample Data) | DiGiFaMaR" },
      {
        name: "description",
        content:
          "A sample preview of the future DiGiFaMaR lender dashboard: portfolio totals, outstanding balance and loan opportunities. All figures are fictional.",
      },
      { property: "og:title", content: "DiGiFaMaR Lender Dashboard — Sample Preview" },
      {
        property: "og:description",
        content:
          "Illustrative preview of the lender dashboard. Sample data only — the lending program is not live.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LenderDemoDashboard,
});

// ─────────────────────────────────────────────────────────────────
// SAMPLE DATA — hardcoded, fictional. Never read from the database.
// ─────────────────────────────────────────────────────────────────

type SampleStat = { label: string; value: string; sub: string; icon: typeof Wallet };

const SAMPLE_STATS: SampleStat[] = [
  { label: "Total funded", value: "$1,240,000", sub: "Across 18 sample farms", icon: Banknote },
  {
    label: "Outstanding balance",
    value: "$486,500",
    sub: "11 sample facilities open",
    icon: Wallet,
  },
  { label: "Repaid to date", value: "$753,500", sub: "Sample repayment history", icon: PiggyBank },
  { label: "Avg. facility size", value: "$68,900", sub: "Illustrative figure", icon: Sprout },
];

type SamplePoint = { month: string; funded: number; outstanding: number };

const SAMPLE_PORTFOLIO: SamplePoint[] = [
  { month: "Jul", funded: 120_000, outstanding: 96_000 },
  { month: "Aug", funded: 185_000, outstanding: 141_000 },
  { month: "Sep", funded: 240_000, outstanding: 176_000 },
  { month: "Oct", funded: 355_000, outstanding: 268_000 },
  { month: "Nov", funded: 470_000, outstanding: 331_000 },
  { month: "Dec", funded: 592_000, outstanding: 402_000 },
  { month: "Jan", funded: 704_000, outstanding: 388_000 },
  { month: "Feb", funded: 810_000, outstanding: 415_000 },
  { month: "Mar", funded: 928_000, outstanding: 440_000 },
  { month: "Apr", funded: 1_046_000, outstanding: 461_000 },
  { month: "May", funded: 1_155_000, outstanding: 474_000 },
  { month: "Jun", funded: 1_240_000, outstanding: 486_500 },
];

type SampleOpportunity = {
  id: string;
  farm: string;
  region: string;
  product: string;
  requested: string;
  termMonths: number;
  purpose: string;
};

const SAMPLE_OPPORTUNITIES: SampleOpportunity[] = [
  {
    id: "sample-1",
    farm: "Sample Farm A",
    region: "Piedmont, NC",
    product: "Heirloom vegetables",
    requested: "$75,000",
    termMonths: 9,
    purpose: "Cold storage expansion ahead of summer harvest",
  },
  {
    id: "sample-2",
    farm: "Sample Farm B",
    region: "Driftless, WI",
    product: "Creamline dairy",
    requested: "$120,000",
    termMonths: 12,
    purpose: "Bottling line upgrade and additional route trucks",
  },
  {
    id: "sample-3",
    farm: "Sample Farm C",
    region: "Willamette, OR",
    product: "Berries",
    requested: "$40,000",
    termMonths: 6,
    purpose: "Seasonal labor and packaging for peak season",
  },
  {
    id: "sample-4",
    farm: "Sample Farm D",
    region: "Hill Country, TX",
    product: "Mixed produce & eggs",
    requested: "$55,000",
    termMonths: 10,
    purpose: "Irrigation repair and new laying flock",
  },
];

const fmtK = (n: number) => `$${Math.round(n / 1000)}k`;

function LenderDemoDashboard() {
  return (
    <SiteLayout>
      {/* Persistent preview banner — sticks to the top of the page content */}
      <div className="sticky top-0 z-20 border-b border-amber-400/30 bg-amber-500/15 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2.5 text-sm sm:px-6">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
          <p className="font-semibold text-foreground">
            Preview — Sample Data.{" "}
            <span className="font-normal text-muted-foreground">
              Every figure, farm and loan below is fictional. Nothing here reflects real users,
              farms, orders or money.
            </span>
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Lender dashboard preview</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          This is an illustration of what a lender's portfolio view could look like once the program
          launches. It is not connected to any account, farm or transaction.
        </p>

        <WaitlistBanner className="mt-6" />

        {/* Stats */}
        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SAMPLE_STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <s.icon className="h-4 w-4 text-primary" /> {s.label}
              </div>
              <p className="mt-1 text-2xl font-extrabold">{s.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </section>

        {/* Portfolio chart */}
        <section className="mt-8 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-lg font-bold">Sample portfolio over 12 months</h2>
            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
              Sample data
            </span>
          </div>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={SAMPLE_PORTFOLIO} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="fundedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={fmtK}
                  tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                />
                <Tooltip
                  formatter={(v: number) => `$${v.toLocaleString("en-US")}`}
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="funded"
                  name="Cumulative funded"
                  stroke="var(--color-primary)"
                  fill="url(#fundedFill)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="outstanding"
                  name="Outstanding"
                  stroke="var(--color-muted-foreground)"
                  fill="transparent"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Opportunities */}
        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-lg font-bold">Sample loan opportunities</h2>
            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
              Fictional farms
            </span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {SAMPLE_OPPORTUNITIES.map((o) => (
              <div key={o.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{o.farm}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.region} · {o.product}
                    </p>
                  </div>
                  <span className="rounded-full bg-leaf-soft px-2.5 py-1 text-sm font-bold text-primary">
                    {o.requested}
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{o.purpose}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Indicative term · {o.termMonths} months
                  </span>
                  <Button size="sm" variant="outline" disabled>
                    Fund — coming soon
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold">Want the real thing when it launches?</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Join the lender waitlist and we'll reach out as soon as the program opens.
          </p>
          <Button asChild className="mt-4">
            <Link to="/lenders/apply">
              Apply to become a lender <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </section>
      </div>
    </SiteLayout>
  );
}
