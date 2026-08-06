/**
 * DiGiFaMaR Trade Score — informational scoring only.
 *
 * IMPORTANT: nothing in this module approves a loan, moves money, or creates a
 * binding offer. It produces a 0-100 advisory score plus a suggested facility
 * size that is rendered read-only to lending partners. Every real decision
 * remains a human action taken outside the platform.
 *
 * Formula (documented, deterministic, pure):
 *
 *   trade_score = round(
 *       0.40 * fulfillment_component
 *     + 0.30 * rating_component
 *     + 0.30 * volume_component
 *   ), clamped to 0..100
 *
 *   fulfillment_component
 *     = 100 * (completed_orders / settled_orders)  where
 *       completed_orders = orders that reached `delivered` or `released`
 *       settled_orders   = all orders except `pending` and `cancelled`
 *     Orders that carried a `delivery_deadline` and completed after it are
 *     counted as half a completion (late but delivered).
 *     Neutral default of 60 when a farmer has fewer than 3 settled orders.
 *
 *   rating_component
 *     = 100 * (avg_rating / 5), neutral default of 60 with fewer than 3 reviews.
 *
 *   volume_component
 *     = 100 * ln(1 + sales / 1_000) / ln(1 + VOLUME_CAP_K)   (capped at 100)
 *     Log scale so a $300k farm is not 30x a $10k farm; VOLUME_CAP_K = 300
 *     ($300k trailing-12-month GMV reaches the top of the scale).
 *
 *   recommended_amount (DISPLAY ONLY)
 *     = clamp(round_to_5k(twelve_month_sales * 0.25 * trade_score / 100), 5_000, 250_000)
 */

export const VOLUME_CAP_K = 300;
export const NEUTRAL_COMPONENT = 60;
export const MIN_SAMPLE = 3;

export type ScoreInputs = {
  /** Orders excluding `pending` and `cancelled`. */
  settledOrders: number;
  /** Orders that reached `delivered` or `released` on or before their deadline. */
  onTimeCompletions: number;
  /** Orders that reached `delivered` or `released` after their deadline. */
  lateCompletions: number;
  avgRating: number;
  reviewCount: number;
  /** Trailing 12-month gross merchandise value, in dollars. */
  twelveMonthSales: number;
};

export type ScoreBreakdown = {
  tradeScore: number;
  fulfillment: number;
  rating: number;
  volume: number;
  recommendedAmount: number;
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function fulfillmentComponent(i: ScoreInputs): number {
  if (i.settledOrders < MIN_SAMPLE) return NEUTRAL_COMPONENT;
  const credited = i.onTimeCompletions + 0.5 * i.lateCompletions;
  return clamp((credited / i.settledOrders) * 100, 0, 100);
}

export function ratingComponent(i: ScoreInputs): number {
  if (i.reviewCount < MIN_SAMPLE) return NEUTRAL_COMPONENT;
  return clamp((i.avgRating / 5) * 100, 0, 100);
}

export function volumeComponent(i: ScoreInputs): number {
  const k = Math.max(0, i.twelveMonthSales) / 1000;
  return clamp((Math.log(1 + k) / Math.log(1 + VOLUME_CAP_K)) * 100, 0, 100);
}

export function computeTradeScore(i: ScoreInputs): ScoreBreakdown {
  const fulfillment = fulfillmentComponent(i);
  const rating = ratingComponent(i);
  const volume = volumeComponent(i);
  const tradeScore = Math.round(clamp(0.4 * fulfillment + 0.3 * rating + 0.3 * volume, 0, 100));
  const raw = i.twelveMonthSales * 0.25 * (tradeScore / 100);
  const recommendedAmount =
    i.twelveMonthSales <= 0 ? 0 : clamp(Math.round(raw / 5000) * 5000, 5000, 250_000);
  return { tradeScore, fulfillment, rating, volume, recommendedAmount };
}

/** Short human-readable rationale stored on the recommendation row. */
export function scoreReason(i: ScoreInputs, b: ScoreBreakdown): string {
  const parts: string[] = [];
  parts.push(
    i.settledOrders < MIN_SAMPLE
      ? "Limited order history — fulfillment scored at the neutral baseline."
      : `${Math.round(b.fulfillment)}% fulfillment across ${i.settledOrders} settled orders.`,
  );
  parts.push(
    i.reviewCount < MIN_SAMPLE
      ? "Fewer than 3 reviews — rating scored at the neutral baseline."
      : `${i.avgRating.toFixed(1)}★ average over ${i.reviewCount} reviews.`,
  );
  parts.push(`$${Math.round(i.twelveMonthSales).toLocaleString()} trailing 12-month sales.`);
  return parts.join(" ");
}

export const INFORMATIONAL_DISCLAIMER =
  "Informational — not a loan approval or offer. Figures are derived from DiGiFaMaR marketplace activity and are provided for underwriting research only.";
