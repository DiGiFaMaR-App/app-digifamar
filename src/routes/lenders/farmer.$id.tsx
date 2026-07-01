import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  Award,
  ChevronLeft,
  Download,
  MapPin,
  Repeat,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  chartTooltip,
  LenderCard,
  LenderShell,
  SectionTitle,
  StatCard,
  TradeScoreBadge,
} from "./-ui";
import {
  buyerBreakdown,
  fmtUSD,
  fmtUSDFull,
  getRecommendedFarmer,
  NAVY,
  ratingsHistory,
  salesSeries,
  scoreTier,
  TIER_META,
} from "./-data";

export const Route = createFileRoute("/lenders/farmer/$id")({
  loader: ({ params }) => {
    const farmer = getRecommendedFarmer(params.id);
    if (!farmer) throw notFound();
    return { farmer };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.farmer.name ?? "Farmer"} — DiGiFaMaR Lending` }],
  }),
  component: FarmerProfile,
});

// Sub-scores that roll up into the headline DiGiFaMaR Trade Score.
function scoreFactors(score: number) {
  return [
    { label: "Sales consistency", value: Math.min(100, score + 4) },
    { label: "Repeat-buyer loyalty", value: Math.max(40, score - 6) },
    { label: "Fulfillment reliability", value: Math.min(100, score + 8) },
    { label: "Rating stability", value: Math.min(100, score + 2) },
    { label: "Tenure & growth", value: Math.max(35, score - 12) },
  ];
}

function FarmerProfile() {
  const { farmer } = Route.useLoaderData();
  const sales = salesSeries(farmer);
  const buyers = buyerBreakdown(farmer);
  const ratings = ratingsHistory(farmer);
  const factors = scoreFactors(farmer.tradeScore);
  const meta = TIER_META[scoreTier(farmer.tradeScore)];
  const buyerTotal = buyers.reduce((s, b) => s + b.value, 0);

  return (
    <LenderShell>
      <Link
        to="/lenders/dashboard"
        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-200"
      >
        <ChevronLeft className="h-4 w-4" /> Back to recommendations
      </Link>

      {/* Header */}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold sm:text-3xl">{farmer.name}</h1>
            <TradeScoreBadge score={farmer.tradeScore} size="lg" />
          </div>
          <p className="mt-1 text-sm text-slate-400">
            <MapPin className="mr-0.5 inline h-4 w-4" />
            {farmer.location} · {farmer.primaryProduct} · {farmer.yearsOnPlatform} years on
            DiGiFaMaR
          </p>
        </div>
        <Link
          to="/farm/$id"
          params={{ id: farmer.id }}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
        >
          <Download className="h-3.5 w-3.5" /> View public farm page
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label="12-month sales"
          value={fmtUSDFull(farmer.twelveMonthSales)}
          accent
        />
        <StatCard
          icon={Repeat}
          label="Repeat buyers"
          value={`${farmer.repeatBuyerPct}%`}
          sub="of revenue"
        />
        <StatCard
          icon={Star}
          label="Avg rating"
          value={`${farmer.avgRating.toFixed(1)} ★`}
          sub="trailing 12 mo"
        />
        <StatCard
          icon={Users}
          label="Suggested facility"
          value={fmtUSDFull(farmer.recommendedAmount)}
          sub="DiGiFaMaR estimate"
        />
      </div>

      {/* Trade Score breakdown */}
      <LenderCard className="mt-6 p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4 lg:w-72 lg:shrink-0">
            <div
              className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl"
              style={{ backgroundColor: meta.bg, boxShadow: `inset 0 0 0 1px ${meta.ring}` }}
            >
              <span className="text-3xl font-extrabold" style={{ color: meta.text }}>
                {farmer.tradeScore}
              </span>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-sm font-bold">
                <Award className="h-4 w-4" style={{ color: meta.text }} /> DiGiFaMaR Trade Score
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {meta.label} tier · derived from verified on-platform trade history.
              </p>
            </div>
          </div>
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {factors.map((fct) => (
              <div key={fct.label}>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{fct.label}</span>
                  <span className="font-bold text-slate-200">{fct.value}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${fct.value}%`, backgroundColor: NAVY.accent }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">
          <span className="font-semibold text-slate-200">Why recommended:</span> {farmer.reason}
        </p>
      </LenderCard>

      {/* Charts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <LenderCard className="p-4 lg:col-span-2">
          <SectionTitle
            right={
              <span className="text-xs font-semibold" style={{ color: "#93B4FF" }}>
                {fmtUSD(farmer.twelveMonthSales)} total
              </span>
            }
          >
            12-month sales
          </SectionTitle>
          <div className="mt-3 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sales} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="lenderSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={NAVY.accent} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={NAVY.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => fmtUSD(v)}
                />
                <Tooltip {...chartTooltip} formatter={(v: number) => [fmtUSDFull(v), "Sales"]} />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke={NAVY.accent}
                  strokeWidth={2}
                  fill="url(#lenderSales)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </LenderCard>

        <LenderCard className="p-4">
          <SectionTitle>Buyer breakdown</SectionTitle>
          <div className="mt-3 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={buyers}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={42}
                  outerRadius={68}
                  paddingAngle={2}
                  stroke="none"
                >
                  {buyers.map((b) => (
                    <Cell key={b.name} fill={b.fill} />
                  ))}
                </Pie>
                <Tooltip {...chartTooltip} formatter={(v: number) => fmtUSDFull(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 space-y-1.5">
            {buyers.map((b) => (
              <div key={b.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: b.fill }} />
                  {b.name}
                </span>
                <span className="font-semibold text-slate-200">
                  {Math.round((b.value / buyerTotal) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </LenderCard>
      </div>

      {/* Ratings history */}
      <LenderCard className="mt-4 p-4">
        <SectionTitle right={<span className="text-xs text-slate-500">trailing 12 months</span>}>
          Ratings history
        </SectionTitle>
        <div className="mt-3 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ratings} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[4, 5]}
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip {...chartTooltip} formatter={(v: number) => [`${v} ★`, "Rating"]} />
              <Line
                type="monotone"
                dataKey="rating"
                stroke="#FBBF24"
                strokeWidth={2}
                dot={{ r: 2.5, fill: "#FBBF24" }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </LenderCard>
    </LenderShell>
  );
}
