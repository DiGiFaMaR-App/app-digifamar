/**
 * Farmer plan comparison matrix — presentation layer for `plans.ts`.
 *
 * Every row states what the CURRENT implementation actually does. A feature is
 * only marked `included` when it is enforced by code or the database today:
 *  - listing limits          → enforced by the `trg_listings_plan_limit` trigger
 *  - featured placement      → plan-ranked sort bias in `src/lib/catalog/catalog.ts`
 *  - everything else below   → available to every farmer regardless of plan, or
 *                              not yet built, in which case it is `soon`.
 *
 * Never flip a value to `included` before the entitlement is genuinely enforced.
 */

import { PLANS, type PlanId } from "./plans";

export type FeatureState =
  | { kind: "yes"; label?: string }
  | { kind: "no"; label?: string }
  | { kind: "soon"; label?: string }
  | { kind: "text"; label: string };

export type FeatureRow = {
  id: string;
  label: string;
  /** Plain-language note about how this actually works today. */
  note?: string;
  values: Record<PlanId, FeatureState>;
};

const yes = (label?: string): FeatureState => ({ kind: "yes", label });
const no = (label?: string): FeatureState => ({ kind: "no", label });
const soon = (label?: string): FeatureState => ({ kind: "soon", label });
const text = (label: string): FeatureState => ({ kind: "text", label });

const allPlans = (v: FeatureState): Record<PlanId, FeatureState> => ({
  free: v,
  pro: v,
  elite: v,
});

export const FEATURE_GROUPS: { title: string; rows: FeatureRow[] }[] = [
  {
    title: "Selling",
    rows: [
      {
        id: "profile",
        label: "Farm profile & verification",
        note: "Admin-reviewed verification is required on every plan before listing.",
        values: allPlans(yes("Included")),
      },
      {
        id: "listing-limit",
        label: "Active product listings",
        note: "Enforced in the database — publishing beyond the cap is blocked.",
        values: {
          free: text(`${PLANS.free.listingLimit} active`),
          pro: text(`${PLANS.pro.listingLimit} active`),
          elite: text("Unlimited"),
        },
      },
      {
        id: "media",
        label: "Product photos",
        note: "Image uploads work the same on every plan today.",
        values: allPlans(yes("Included")),
      },
      {
        id: "marketplace",
        label: "Marketplace & map visibility",
        values: allPlans(yes("Included")),
      },
      {
        id: "featured",
        label: "Featured search placement",
        note: "Paid plans are ranked ahead of free farmers in marketplace results. No listing is ever hidden.",
        values: {
          free: no("Standard"),
          pro: yes("Featured"),
          elite: yes("Top featured"),
        },
      },
      {
        id: "promotions",
        label: "Discounts & promotions",
        note: "Not built yet on any plan.",
        values: allPlans(soon()),
      },
    ],
  },
  {
    title: "Orders & money",
    rows: [
      {
        id: "orders",
        label: "Order management",
        values: allPlans(yes("Included")),
      },
      {
        id: "escrow",
        label: "Escrow protection & 6-digit release code",
        note: "Identical on every plan — funds release only after the buyer confirms delivery.",
        values: allPlans(yes("Included")),
      },
      {
        id: "fee",
        label: "DiGiFaMaR platform fee",
        note: "Plans buy reach and tooling, never a discounted fee. Escrow and payment-processing charges are billed separately.",
        values: allPlans(text("10% per sale")),
      },
      {
        id: "earnings",
        label: "Earnings & payout tracking",
        values: allPlans(yes("Included")),
      },
      {
        id: "analytics",
        label: "Advanced sales analytics",
        note: "The basic sales summary is on every plan. Plan-gated advanced analytics is not built yet.",
        values: {
          free: text("Basic summary"),
          pro: soon("Basic summary today"),
          elite: soon("Basic summary today"),
        },
      },
    ],
  },
  {
    title: "Buyers & growth",
    rows: [
      {
        id: "messaging",
        label: "Buyer messaging",
        values: allPlans(yes("Included")),
      },
      {
        id: "financing",
        label: "Lending & financing information",
        note: "Informational only on every plan — DiGiFaMaR makes no automated loan decisions.",
        values: allPlans(yes("Informational")),
      },
      {
        id: "badge",
        label: "Plan badge on your farm page",
        note: "The VIP verification badge add-on is live and separate from plans; a plan badge is not shown yet.",
        values: allPlans(soon()),
      },
      {
        id: "support",
        label: "Support",
        note: "All plans are supported by the same email/WhatsApp team today; response prioritisation is manual.",
        values: {
          free: text("Email support"),
          pro: text("Email support"),
          elite: text("Email support"),
        },
      },
    ],
  },
];

/** Short positioning line per plan — visual differentiation only. */
export const PLAN_POSITIONING: Record<PlanId, { tag: string; blurb: string }> = {
  free: {
    tag: "Starter",
    blurb: "Get your farm listed and take your first orders.",
  },
  pro: {
    tag: "Growth",
    blurb: "More listings and featured placement to reach more buyers.",
  },
  elite: {
    tag: "Maximum",
    blurb: "Unlimited listings and top featured placement.",
  },
};
