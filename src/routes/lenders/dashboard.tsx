import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpRight, MapPin, Search, Star, TrendingUp, Users, Wallet } from "lucide-react";
import { LenderCard, LenderShell, SectionTitle, StatCard, TradeScoreBadge } from "./-ui";
import {
  fmtUSD,
  fmtUSDFull,
  NAVY,
  recommendedFarmers,
  scoreTier,
  TIER_META,
  type TradeScoreTier,
} from "./-data";

export const Route = createFileRoute("/lenders/dashboard")({
  head: () => ({ meta: [{ title: "Lender Dashboard — DiGiFaMaR Lending" }] }),
  component: LenderDashboard,
});

const TIERS: { value: TradeScoreTier | "all"; label: string }[] = [
  { value: "all", label: "All tiers" },
  { value: "prime", label: "Prime (80+)" },
  { value: "strong", label: "Strong (65+)" },
  { value: "fair", label: "Fair (50+)" },
  { value: "watch", label: "Watch (<50)" },
];

type SortKey = "score" | "sales" | "amount";

function LenderDashboard() {
  const [tier, setTier] = useState<TradeScoreTier | "all">("all");
  const [minScore, setMinScore] = useState(0);
  const [state, setState] = useState("all");
  const [sort, setSort] = useState<SortKey>("score");

  const states = useMemo(
    () => ["all", ...Array.from(new Set(recommendedFarmers.map((f) => f.state))).sort()],
    [],
  );

  const filtered = useMemo(() => {
    const out = recommendedFarmers.filter((f) => {
      if (tier !== "all" && scoreTier(f.tradeScore) !== tier) return false;
      if (f.tradeScore < minScore) return false;
      if (state !== "all" && f.state !== state) return false;
      return true;
    });
    out.sort((a, b) =>
      sort === "score"
        ? b.tradeScore - a.tradeScore
        : sort === "sales"
          ? b.twelveMonthSales - a.twelveMonthSales
          : b.recommendedAmount - a.recommendedAmount,
    );
    return out;
  }, [tier, minScore, state, sort]);

  const portfolio = useMemo(() => {
    const count = recommendedFarmers.length;
    const avgScore = Math.round(recommendedFarmers.reduce((s, f) => s + f.tradeScore, 0) / count);
    const pipeline = recommendedFarmers.reduce((s, f) => s + f.recommendedAmount, 0);
    const prime = recommendedFarmers.filter((f) => scoreTier(f.tradeScore) === "prime").length;
    return { count, avgScore, pipeline, prime };
  }, []);

  return (
    <LenderShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Lending partner</p>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Recommended farmers</h1>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
          Updated daily from DiGiFaMaR trade data
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Recommended farms" value={portfolio.count} accent />
        <StatCard icon={TrendingUp} label="Avg Trade Score" value={portfolio.avgScore} sub="across recommendations" />
        <StatCard icon={Wallet} label="Lending pipeline" value={fmtUSD(portfolio.pipeline)} sub="suggested facilities" />
        <StatCard icon={Star} label="Prime-tier farms" value={portfolio.prime} sub="score 80 or higher" />
      </div>

      {/* Filters */}
      <LenderCard className="mt-6 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-0">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Trade Score tier</p>
            <div className="flex flex-wrap gap-1.5">
              {TIERS.map((t) => {
                const active = tier === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setTier(t.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      active ? "text-white" : "text-slate-400 hover:text-slate-200"
                    }`}
                    style={active ? { backgroundColor: NAVY.accent } : { backgroundColor: "rgba(255,255,255,0.05)" }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">State</p>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#1D4ED8]"
            >
              {states.map((s) => (
                <option key={s} value={s} className="bg-[#111827]">
                  {s === "all" ? "All states" : s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Sort by</p>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#1D4ED8]"
            >
              <option value="score" className="bg-[#111827]">Trade Score</option>
              <option value="sales" className="bg-[#111827]">12-mo sales</option>
              <option value="amount" className="bg-[#111827]">Suggested amount</option>
            </select>
          </div>

          <div className="grow">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Min Trade Score: <span style={{ color: "#93B4FF" }}>{minScore}</span>
            </p>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-full accent-[#1D4ED8]"
            />
          </div>
        </div>
      </LenderCard>

      <div className="mt-6">
        <SectionTitle
          right={<span className="text-xs text-slate-500">{filtered.length} of {recommendedFarmers.length} farms</span>}
        >
          Matches
        </SectionTitle>

        {filtered.length === 0 ? (
          <LenderCard className="mt-3 grid place-items-center p-10 text-center">
            <Search className="h-6 w-6 text-slate-500" />
            <p className="mt-2 text-sm text-slate-400">No farms match these filters.</p>
            <button
              onClick={() => {
                setTier("all");
                setMinScore(0);
                setState("all");
              }}
              className="mt-3 text-xs font-semibold"
              style={{ color: "#93B4FF" }}
            >
              Reset filters
            </button>
          </LenderCard>
        ) : (
          <div className="mt-3 space-y-3">
            {filtered.map((f) => {
              const meta = TIER_META[scoreTier(f.tradeScore)];
              return (
                <Link
                  key={f.id}
                  to="/lenders/farmer/$id"
                  params={{ id: f.id }}
                  className="block transition hover:-translate-y-0.5"
                >
                  <LenderCard
                    className="p-4 transition hover:border-white/20"
                    style={{ backgroundColor: NAVY.card, borderLeft: `3px solid ${meta.dot}` }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-base font-bold">{f.name}</h3>
                          <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-500" />
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400">
                          <MapPin className="mr-0.5 inline h-3.5 w-3.5" />
                          {f.location} · {f.primaryProduct} · {f.yearsOnPlatform}y on platform
                        </p>
                      </div>
                      <TradeScoreBadge score={f.tradeScore} />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Metric label="12-mo sales" value={fmtUSDFull(f.twelveMonthSales)} />
                      <Metric label="Repeat buyers" value={`${f.repeatBuyerPct}%`} />
                      <Metric label="Avg rating" value={`${f.avgRating.toFixed(1)} ★`} />
                      <Metric label="Suggested" value={fmtUSDFull(f.recommendedAmount)} accent />
                    </div>
                  </LenderCard>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </LenderShell>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-sm font-bold" style={accent ? { color: "#93B4FF" } : undefined}>
        {value}
      </p>
    </div>
  );
}
