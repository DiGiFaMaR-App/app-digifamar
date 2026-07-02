/**
 * DiGiFaMaR checkout pricing.
 *
 * Every order carries two fees on top of the item subtotal, both shown to the
 * buyer at checkout and both computed on the item subtotal:
 *   - Platform fee: 8%   (DiGiFaMaR marketplace fee)
 *   - Escrow fee:   3.25% (Escrow.com-protected settlement)
 *
 * All math is done in integer cents to avoid floating-point drift, then
 * formatted for display at the edges.
 */

export const PLATFORM_FEE_RATE = 0.08;
export const ESCROW_FEE_RATE = 0.0325;

export type FeeBreakdown = {
  subtotalCents: number;
  platformFeeCents: number;
  escrowFeeCents: number;
  deliveryFeeCents: number;
  totalCents: number;
};

/**
 * Compute the platform + escrow fees, delivery fee, and grand total.
 *
 * `deliveryFeeCents` is computed separately (see `computeDeliveryFee`) and
 * passed in so this stays a pure function of already-resolved amounts. It
 * defaults to 0 so existing callers (e.g. the cart badge, which has no delivery
 * choice yet) keep working unchanged.
 */
export function computeFees(subtotalCents: number, deliveryFeeCents = 0): FeeBreakdown {
  const subtotal = Math.max(0, Math.round(subtotalCents));
  const delivery = Math.max(0, Math.round(deliveryFeeCents));
  const platformFeeCents = Math.round(subtotal * PLATFORM_FEE_RATE);
  const escrowFeeCents = Math.round(subtotal * ESCROW_FEE_RATE);
  return {
    subtotalCents: subtotal,
    platformFeeCents,
    escrowFeeCents,
    deliveryFeeCents: delivery,
    totalCents: subtotal + platformFeeCents + escrowFeeCents + delivery,
  };
}

// ─────────────────────────────────────────────────────────────────
// DELIVERY
// ─────────────────────────────────────────────────────────────────

export type DeliveryMethod = "pickup" | "standard" | "express";

export const DELIVERY_METHODS: Record<
  DeliveryMethod,
  { label: string; description: string; eta: string }
> = {
  pickup: {
    label: "Farm pickup",
    description: "Collect directly from the farm",
    eta: "Arrange with farmer",
  },
  standard: {
    label: "Standard delivery",
    description: "Cold-chain courier to your door",
    eta: "2–4 days",
  },
  express: {
    label: "Express delivery",
    description: "Priority next-day cold-chain courier",
    eta: "1 day",
  },
};

/** Miles within which delivery carries no distance surcharge (base fee only). */
export const FREE_DELIVERY_RADIUS_MILES = 10;

const DELIVERY_RATES: Record<
  Exclude<DeliveryMethod, "pickup">,
  { baseCents: number; perMileCents: number; capCents: number; unknownDistanceCents: number }
> = {
  standard: { baseCents: 499, perMileCents: 35, capCents: 2499, unknownDistanceCents: 899 },
  express: { baseCents: 999, perMileCents: 60, capCents: 4999, unknownDistanceCents: 1799 },
};

/**
 * Distance-based delivery fee, in integer cents.
 *
 * - `pickup` is always free.
 * - For a known `distanceMiles`, charge a base fee plus a per-mile rate for
 *   every mile beyond the free radius, capped so long-haul orders stay sane.
 * - When distance is unknown (buyer hasn't shared a location, or the farm has
 *   no coordinates), fall back to a flat per-method fee.
 */
export function computeDeliveryFee(distanceMiles: number | null, method: DeliveryMethod): number {
  if (method === "pickup") return 0;
  const rate = DELIVERY_RATES[method];
  if (distanceMiles === null || !Number.isFinite(distanceMiles) || distanceMiles < 0) {
    return rate.unknownDistanceCents;
  }
  const billableMiles = Math.max(0, distanceMiles - FREE_DELIVERY_RADIUS_MILES);
  const fee = rate.baseCents + Math.round(billableMiles * rate.perMileCents);
  return Math.min(fee, rate.capCents);
}

/** Dollars (e.g. 5.5) → integer cents (550), rounding half-up. */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/** Integer cents → "$1,234.56" for display. */
export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

/** Human-readable fee rate, e.g. 0.08 → "8%". */
export function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}
