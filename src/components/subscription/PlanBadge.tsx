import { PLANS, type PlanId } from "@/lib/entitlements/plans";
import { PLAN_POSITIONING } from "@/lib/entitlements/plan-features";

const TONE: Record<PlanId, string> = {
  free: "border-border bg-muted text-muted-foreground",
  pro: "border-primary/40 bg-primary/10 text-primary",
  elite: "border-secondary/50 bg-secondary/15 text-secondary-foreground",
};

/**
 * Consistent Free / Pro / Elite label used in the dashboard, billing and
 * pricing surfaces so plan terminology never diverges.
 */
export function PlanBadge({ plan, showTag = false }: { plan: PlanId; showTag?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${TONE[plan]}`}
    >
      {PLANS[plan].name}
      {showTag ? (
        <span className="font-medium normal-case opacity-80">· {PLAN_POSITIONING[plan].tag}</span>
      ) : null}
    </span>
  );
}
