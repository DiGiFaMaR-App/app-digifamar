/**
 * Farmer subscription plans + entitlements — single source of truth.
 *
 * Plan identity comes from the Stripe price id stored on `subscriptions.price_id`
 * (a stable human-readable lookup key, identical in sandbox and live). The
 * database mirrors the resolved plan onto `farmer_profiles.plan` so public
 * surfaces (featured placement, badges) can read it without a Stripe round-trip.
 *
 * The 10% DiGiFaMaR platform fee is identical on every plan — plans buy reach
 * and tooling, never a discounted fee.
 */

export type PlanId = "free" | "pro" | "elite";

export const PLAN_PRICE_IDS = {
  pro: "pro_monthly",
  elite: "elite_monthly",
} as const satisfies Record<Exclude<PlanId, "free">, string>;

/** Reverse lookup: Stripe price id → plan id. */
export const PLAN_BY_PRICE_ID: Record<string, PlanId> = {
  pro_monthly: "pro",
  elite_monthly: "elite",
};

export type PlanDefinition = {
  id: PlanId;
  name: string;
  priceLabel: string;
  priceId: string | null;
  monthlyCents: number;
  /** Maximum simultaneously active listings. `null` = unlimited. */
  listingLimit: number | null;
  featuredPlacement: boolean;
  fullAnalytics: boolean;
  planBadge: "none" | "verified" | "elite";
  highlight?: boolean;
  features: string[];
};

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    priceLabel: "$0",
    priceId: null,
    monthlyCents: 0,
    listingLimit: 5,
    featuredPlacement: false,
    fullAnalytics: false,
    planBadge: "none",
    features: [
      "5 active listings",
      "Standard search placement",
      "Escrow-protected orders (10% platform fee)",
      "Buyer messaging & basic sales summary",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceLabel: "$29",
    priceId: PLAN_PRICE_IDS.pro,
    monthlyCents: 2900,
    listingLimit: 25,
    featuredPlacement: true,
    fullAnalytics: true,
    planBadge: "verified",
    highlight: true,
    features: [
      "25 active listings",
      "Featured search placement above free farms",
      "Escrow-protected orders (10% platform fee)",
      "Buyer messaging & basic sales summary",
      "Advanced analytics — coming soon",
    ],
  },
  elite: {
    id: "elite",
    name: "Elite",
    priceLabel: "$79",
    priceId: PLAN_PRICE_IDS.elite,
    monthlyCents: 7900,
    listingLimit: null,
    featuredPlacement: true,
    fullAnalytics: true,
    planBadge: "elite",
    features: [
      "Unlimited active listings",
      "Top featured search placement",
      "Escrow-protected orders (10% platform fee)",
      "Buyer messaging & basic sales summary",
      "Advanced analytics — coming soon",
      "Elite plan badge — coming soon",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "pro", "elite"];

/** Higher rank = more entitlements. Used for upgrade/downgrade copy and sorting. */
export function planRank(plan: PlanId): number {
  return PLAN_ORDER.indexOf(plan);
}

export function planFromPriceId(priceId: string | null | undefined): PlanId {
  if (!priceId) return "free";
  return PLAN_BY_PRICE_ID[priceId] ?? "free";
}

export function isPlanPriceId(priceId: string): boolean {
  return priceId in PLAN_BY_PRICE_ID;
}

/** Listing cap for a plan, as a display string. */
export function listingLimitLabel(plan: PlanId): string {
  const limit = PLANS[plan].listingLimit;
  return limit === null ? "Unlimited" : String(limit);
}

/** True when the farmer may publish one more active listing. */
export function canPublishAnother(plan: PlanId, activeCount: number): boolean {
  const limit = PLANS[plan].listingLimit;
  return limit === null || activeCount < limit;
}
