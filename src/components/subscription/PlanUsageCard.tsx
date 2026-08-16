import { Link } from "@tanstack/react-router";
import { canPublishAnother, listingLimitLabel, PLANS } from "@/lib/entitlements/plans";
import { PLAN_POSITIONING } from "@/lib/entitlements/plan-features";
import { PlanBadge } from "./PlanBadge";
import { usePlan } from "@/hooks/use-subscription";

const ACTION =
  "inline-flex min-h-[44px] items-center rounded-lg px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4ADE80]";

/**
 * "Current plan" card for the farmer dashboard: plan, real listing usage
 * against the database-enforced cap, renewal state, and manage/upgrade
 * actions that use the existing subscription flow.
 */
export function PlanUsageCard({ activeListings }: { activeListings: number }) {
  const { plan, definition, renewsAt, cancelAtPeriodEnd, pastDue, loading } = usePlan();
  if (loading) return null;

  const limit = definition.listingLimit;
  const atLimit = !canPublishAnother(plan, activeListings);
  const pct = limit === null ? 0 : Math.min(100, Math.round((activeListings / limit) * 100));

  return (
    <section
      aria-label="Current plan"
      className="rounded-xl border border-[#1E3A1E] bg-[#0B1A0B] p-4 text-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[220px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs uppercase tracking-wider text-[#7AAB7A]">Current plan</p>
            <PlanBadge plan={plan} showTag />
          </div>
          <p className="mt-1 font-semibold">
            {definition.name} · {definition.priceLabel}/month
            {definition.featuredPlacement ? " · featured placement active" : ""}
          </p>
          <p className="mt-0.5 text-[#7AAB7A]">{PLAN_POSITIONING[plan].blurb}</p>

          <div className="mt-3 max-w-sm">
            <div className="flex items-center justify-between text-xs text-[#7AAB7A]">
              <span>Active listings</span>
              <span>
                {activeListings} of {listingLimitLabel(plan)}
              </span>
            </div>
            {limit === null ? (
              <p className="mt-1 text-xs text-[#7AAB7A]">No listing cap on Elite.</p>
            ) : (
              <div
                className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#122A12]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={limit}
                aria-valuenow={Math.min(activeListings, limit)}
                aria-label={`${activeListings} of ${limit} active listings used`}
              >
                <div
                  className={`h-full rounded-full ${atLimit ? "bg-amber-400" : "bg-[#4ADE80]"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>

          {renewsAt ? (
            <p className="mt-2 text-xs text-[#7AAB7A]">
              {cancelAtPeriodEnd ? "Access ends" : "Renews"} {renewsAt.toLocaleDateString()}
            </p>
          ) : null}
          {pastDue ? (
            <p className="mt-1 text-red-300">
              Payment failed — update your card in billing to keep your {definition.name} plan.
            </p>
          ) : null}
          {atLimit ? (
            <p className="mt-2 text-amber-300">
              You&apos;ve used all {listingLimitLabel(plan)} active listings. Deactivate one, or
              upgrade to {plan === "free" ? PLANS.pro.name : PLANS.elite.name} for{" "}
              {plan === "free" ? PLANS.pro.listingLimit : "unlimited"} active listings.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/pricing"
            className={`${ACTION} bg-[#4ADE80] text-black hover:bg-[#22C55E]`}
            aria-label={plan === "elite" ? "Compare plans" : "Upgrade plan"}
          >
            {plan === "elite" ? "Compare plans" : "Upgrade"}
          </Link>
          <Link
            to="/settings/billing"
            className={`${ACTION} border border-[#1E3A1E] text-[#CFE9CF] hover:bg-[#122A12]`}
          >
            {plan === "free" ? "Billing" : "Manage plan"}
          </Link>
        </div>
      </div>
    </section>
  );
}
