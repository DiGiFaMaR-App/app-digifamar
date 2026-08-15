import { Link } from "@tanstack/react-router";
import { canPublishAnother, listingLimitLabel } from "@/lib/entitlements/plans";
import { usePlan } from "@/hooks/use-subscription";

/**
 * Farmer plan + listing-quota summary. The hard limit is enforced in the
 * database; this only makes the quota visible before the farmer hits it.
 */
export function PlanUsageCard({ activeListings }: { activeListings: number }) {
  const { plan, definition, renewsAt, cancelAtPeriodEnd, pastDue, loading } = usePlan();
  if (loading) return null;

  const atLimit = !canPublishAnother(plan, activeListings);

  return (
    <div className="rounded-xl border border-[#1E3A1E] bg-[#0B1A0B] p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">
            {definition.name} plan · {definition.priceLabel}/month
          </p>
          <p className="mt-0.5 text-[#7AAB7A]">
            {activeListings} of {listingLimitLabel(plan)} active listings used
            {definition.featuredPlacement ? " · featured placement on" : ""}
            {renewsAt
              ? ` · ${cancelAtPeriodEnd ? "ends" : "renews"} ${renewsAt.toLocaleDateString()}`
              : ""}
          </p>
          {pastDue ? (
            <p className="mt-1 text-red-300">
              Payment failed — update your card to keep your plan.
            </p>
          ) : null}
          {atLimit ? (
            <p className="mt-1 text-amber-300">
              You&apos;ve reached your plan&apos;s listing limit. Upgrade or deactivate a listing to
              add another.
            </p>
          ) : null}
        </div>
        <div className="flex gap-3">
          <Link to="/pricing" className="font-semibold text-[#4ADE80] hover:underline">
            {plan === "elite" ? "Compare plans" : "Upgrade"}
          </Link>
          <Link to="/settings/billing" className="font-semibold text-[#7AAB7A] hover:underline">
            Billing
          </Link>
        </div>
      </div>
    </div>
  );
}
