import { Check, Clock, Minus } from "lucide-react";
import { PLANS, PLAN_ORDER, type PlanId } from "@/lib/entitlements/plans";
import type { FeatureRow, FeatureState } from "@/lib/entitlements/plan-features";

function Value({ value }: { value: FeatureState }) {
  if (value.kind === "text") return <span className="font-medium">{value.label}</span>;
  if (value.kind === "yes")
    return (
      <span className="inline-flex items-center gap-1.5 font-medium">
        <Check className="h-4 w-4 text-primary" aria-hidden="true" />
        <span>{value.label ?? "Included"}</span>
      </span>
    );
  if (value.kind === "soon")
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Clock className="h-4 w-4" aria-hidden="true" />
        <span>{value.label ?? "Coming soon"}</span>
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <Minus className="h-4 w-4" aria-hidden="true" />
      <span>{value.label ?? "Not included"}</span>
    </span>
  );
}

/**
 * Feature comparison across Free / Pro / Elite. Table on desktop, stacked
 * cards on mobile. Values come straight from the entitlement matrix, which
 * only marks a feature included when it is actually enforced today.
 */
export function PlanComparison({
  groups,
  currentPlan,
}: {
  groups: { title: string; rows: FeatureRow[] }[];
  currentPlan?: PlanId | null;
}) {
  return (
    <section className="mt-16" aria-labelledby="plan-comparison-heading">
      <h2 id="plan-comparison-heading" className="text-2xl font-bold">
        What each plan actually includes
      </h2>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
        Only features that are live today are marked as included. Anything still being built is
        labelled “coming soon” so you never pay for something that isn&apos;t working yet.
      </p>

      {/* Desktop table */}
      <div className="mt-6 hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Free, Pro and Elite plan feature comparison</caption>
          <thead>
            <tr>
              <th scope="col" className="w-[34%] py-3 text-left font-semibold">
                Feature
              </th>
              {PLAN_ORDER.map((p) => (
                <th key={p} scope="col" className="py-3 text-left font-semibold">
                  {PLANS[p].name}
                  <span className="ml-1 font-normal text-muted-foreground">
                    {PLANS[p].priceLabel}/mo
                  </span>
                  {currentPlan === p ? (
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                      Current
                    </span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <>
                <tr key={group.title}>
                  <th
                    scope="colgroup"
                    colSpan={4}
                    className="border-t border-border pt-6 pb-2 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground"
                  >
                    {group.title}
                  </th>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.id} className="border-t border-border/60 align-top">
                    <th scope="row" className="py-3 pr-4 text-left font-medium">
                      {row.label}
                      {row.note ? (
                        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                          {row.note}
                        </span>
                      ) : null}
                    </th>
                    {PLAN_ORDER.map((p) => (
                      <td key={p} className="py-3 pr-4">
                        <Value value={row.values[p]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked */}
      <div className="mt-6 space-y-6 md:hidden">
        {groups.map((group) => (
          <div key={group.title} className="rounded-2xl border border-border bg-card p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {group.title}
            </h3>
            <ul className="mt-3 space-y-4">
              {group.rows.map((row) => (
                <li key={row.id}>
                  <p className="font-medium">{row.label}</p>
                  {row.note ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{row.note}</p>
                  ) : null}
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    {PLAN_ORDER.map((p) => (
                      <div key={p}>
                        <dt className="text-muted-foreground">{PLANS[p].name}</dt>
                        <dd className="mt-0.5">
                          <Value value={row.values[p]} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
