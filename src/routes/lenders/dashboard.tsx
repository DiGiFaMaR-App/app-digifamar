import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Info, MapPin, Search, Star, TrendingUp, Users, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureLenderProfileFn } from "@/lib/lenders/lenders.functions";
import { INFORMATIONAL_DISCLAIMER } from "@/lib/lenders/recommendations";
import { LenderCard, LenderShell, SectionTitle, StatCard, TradeScoreBadge } from "./-ui";
import {
  fmtUSD,
  fmtUSDFull,
  institutionTypeLabel,
  NAVY,
  scoreTier,
  TIER_META,
  type RecommendedFarmer,
  type TradeScoreTier,
} from "./-data";

export const Route = createFileRoute("/lenders/dashboard")({
  head: () => ({
    meta: [
      { title: "Lender Dashboard — DiGiFaMaR Lending" },
      {
        name: "description",
        content:
          "Informational farmer trade insights for DiGiFaMaR lending partners — not a loan approval or offer.",
      },
      { property: "og:title", content: "Lender Dashboard — DiGiFaMaR Lending" },
      {
        property: "og:description",
        content: "Trade Score insights derived from real DiGiFaMaR marketplace activity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
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
type LenderInfo = { institution_name: string; institution_type: string; status: string } | null;

function LenderDashboard() {
  const [tier, setTier] = useState<TradeScoreTier | "all">("all");
  const [minScore, setMinScore] = useState(0);
  const [state, setState] = useState("all");
  const [sort, setSort] = useState<SortKey>("score");

  const [rows, setRows] = useState<RecommendedFarmer[]>([]);
  const [lender, setLender] = useState<LenderInfo>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) throw new Error("Sign in with your approved lender account to continue.");

        // Provision the lender profile on first sign-in after admin approval.
        let { data: profile } = await supabase
          .from("lender_profiles")
          .select("institution_name, institution_type, status")
          .eq("user_id", auth.user.id)
          .maybeSingle();
        if (!profile) {
          await ensureLenderProfileFn().catch(() => undefined);
          ({ data: profile } = await supabase
            .from("lender_profiles")
            .select("institution_name, institution_type, status")
            .eq("user_id", auth.user.id)
            .maybeSingle());
        }

        const { data: recs, error: recErr } = await supabase
          .from("farmer_lender_recommendations")
          .select(
            "farmer_id, trade_score, twelve_month_sales, repeat_buyer_pct, avg_rating, recommended_amount, reason",
          )
          .order("trade_score", { ascending: false })
          .limit(200);
        if (recErr) throw new Error(recErr.message);

        const ids = (recs ?? []).map((r) => r.farmer_id);
        const { data: farms } = ids.length
          ? await supabase
              .from("farmer_profiles")
              .select("user_id, farm_name, city, state, products")
              .in("user_id", ids)
          : { data: [] };
        const byId = new Map((farms ?? []).map((f) => [f.user_id, f]));

        const mapped: RecommendedFarmer[] = (recs ?? []).map((r) => {
          const f = byId.get(r.farmer_id);
          return {
            id: r.farmer_id,
            name: f?.farm_name ?? "Unlisted farm",
            location: [f?.city, f?.state].filter(Boolean).join(", ") || "—",
            state: f?.state ?? "—",
            primaryProduct: f?.products?.[0] ?? "Mixed produce",
            tradeScore: r.trade_score,
            twelveMonthSales: Number(r.twelve_month_sales),
            repeatBuyerPct: Number(r.repeat_buyer_pct),
            avgRating: Number(r.avg_rating),
            recommendedAmount: Number(r.recommended_amount),
            reason: r.reason ?? "",
          };
        });

        if (!cancelled) {
          setLender(profile ?? null);
          setRows(mapped);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load recommendations");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const states = useMemo(
    () => ["all", ...Array.from(new Set(rows.map((f) => f.state))).sort()],
    [rows],
  );

  const filtered = useMemo(() => {
    const out = rows.filter((f) => {
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
  }, [rows, tier, minScore, state, sort]);

  const portfolio = useMemo(() => {
    const count = rows.length;
    const avgScore = count ? Math.round(rows.reduce((s, f) => s + f.tradeScore, 0) / count) : 0;
    const pipeline = rows.reduce((s, f) => s + f.recommendedAmount, 0);
    const prime = rows.filter((f) => scoreTier(f.tradeScore) === "prime").length;
    return { count, avgScore, pipeline, prime };
  }, [rows]);

  return (
    <LenderShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">
            {lender
              ? `${lender.institution_name} · ${institutionTypeLabel(lender.institution_type)}`
              : "Lending partner"}
          </p>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Farmer trade insights</h1>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
          Computed from real DiGiFaMaR marketplace activity
        </span>
      </div>

      <LenderCard className="mt-4 flex items-start gap-2 p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#93B4FF" }} />
        <p className="text-xs text-slate-400">
          <span className="font-semibold text-slate-200">
            Informational — not a loan approval or offer.
          </span>{" "}
          {INFORMATIONAL_DISCLAIMER.replace("Informational — not a loan approval or offer. ", "")}
        </p>
      </LenderCard>

      {error ? <LenderCard className="mt-4 p-6 text-sm text-slate-300">{error}</LenderCard> : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Farms with insights" value={portfolio.count} accent />
        <StatCard
          icon={TrendingUp}
          label="Avg Trade Score"
          value={portfolio.avgScore}
          sub="across insights"
        />
        <StatCard
          icon={Wallet}
          label="Suggested facilities"
          value={fmtUSD(portfolio.pipeline)}
          sub="display only, no offer"
        />
        <StatCard
          icon={Star}
          label="Prime-tier farms"
          value={portfolio.prime}
          sub="score 80 or higher"
        />
      </div>

      {/* Filters */}
      <LenderCard className="mt-6 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-0">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Trade Score tier
            </p>
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
                    style={
                      active
                        ? { backgroundColor: NAVY.accent }
                        : { backgroundColor: "rgba(255,255,255,0.05)" }
                    }
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              State
            </p>
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
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Sort by
            </p>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#1D4ED8]"
            >
              <option value="score" className="bg-[#111827]">
                Trade Score
              </option>
              <option value="sales" className="bg-[#111827]">
                12-mo sales
              </option>
              <option value="amount" className="bg-[#111827]">
                Suggested amount
              </option>
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
          right={
            <span className="text-xs text-slate-500">
              {filtered.length} of {rows.length} farms
            </span>
          }
        >
          Matches
        </SectionTitle>

        {loading ? (
          <LenderCard className="mt-3 p-10 text-center text-sm text-slate-400">
            Loading trade insights…
          </LenderCard>
        ) : filtered.length === 0 ? (
          <LenderCard className="mt-3 grid place-items-center p-10 text-center">
            <Search className="h-6 w-6 text-slate-500" />
            <p className="mt-2 text-sm text-slate-400">
              {rows.length === 0
                ? "No trade insights have been computed yet."
                : "No farms match these filters."}
            </p>
            {rows.length > 0 ? (
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
            ) : null}
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
                          {f.location} · {f.primaryProduct}
                        </p>
                      </div>
                      <TradeScoreBadge score={f.tradeScore} />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Metric label="12-mo sales" value={fmtUSDFull(f.twelveMonthSales)} />
                      <Metric label="Repeat buyers" value={`${f.repeatBuyerPct}%`} />
                      <Metric label="Avg rating" value={`${f.avgRating.toFixed(1)} ★`} />
                      <Metric
                        label="Suggested (info only)"
                        value={fmtUSDFull(f.recommendedAmount)}
                        accent
                      />
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

function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-sm font-bold" style={accent ? { color: "#93B4FF" } : undefined}>
        {value}
      </p>
    </div>
  );
}
