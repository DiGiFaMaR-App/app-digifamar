import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Lock } from "lucide-react";
import { PLANS, PLAN_ORDER, planRank, type PlanId } from "@/lib/entitlements/plans";

/**
 * Contextual upgrade prompt shown when a farmer hits a real, enforced limit.
 * The copy states exactly what the next plan unlocks — no generic marketing.
 */
export function UpgradePrompt({
  plan,
  title,
  detail,
  onDismiss,
}: {
  plan: PlanId;
  title: string;
  detail: string;
  onDismiss?: () => void;
}) {
  const next = PLAN_ORDER.find((p) => planRank(p) > planRank(plan));
  const nextDef = next ? PLANS[next] : null;

  return (
    <div
      role="status"
      className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100"
    >
      <p className="flex items-center gap-2 font-semibold">
        <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
        {title}
      </p>
      <p className="mt-1 opacity-90">{detail}</p>
      {nextDef ? (
        <p className="mt-1 opacity-90">
          {nextDef.name} ({nextDef.priceLabel}/month) raises your cap to{" "}
          {nextDef.listingLimit === null ? "unlimited" : nextDef.listingLimit} active listings and
          ranks your farm above free farms in marketplace search. The 10% platform fee is unchanged.
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to="/pricing"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-amber-400 px-4 font-semibold text-black hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
        >
          {nextDef ? `Upgrade to ${nextDef.name}` : "Compare plans"}
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-[44px] rounded-lg px-4 font-semibold underline underline-offset-4"
          >
            Not now
          </button>
        ) : null}
      </div>
    </div>
  );
}
