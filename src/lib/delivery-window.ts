/**
 * Estimated delivery window for a nearby farm.
 *
 * Presentation-only helper: turns the already-computed distance between the
 * buyer's location and the farm into a human delivery estimate. It does NOT
 * create any commitment — farmers still set their own delivery terms, so the
 * copy is always framed as an estimate.
 */

export type DeliveryWindow = {
  /** Short badge label, e.g. "Same day" or "1-2 days". */
  label: string;
  /** Longer sentence used in tooltips / detail copy. */
  detail: string;
  /** Fastest plausible day count (0 = same day) — used for sorting. */
  minDays: number;
  /** Slowest plausible day count — used for sorting ties. */
  maxDays: number;
};

const TIERS: Array<{ maxMiles: number; window: DeliveryWindow }> = [
  {
    maxMiles: 15,
    window: {
      label: "Same day",
      detail: "Usually delivered or ready for pickup the same day.",
      minDays: 0,
      maxDays: 1,
    },
  },
  {
    maxMiles: 40,
    window: {
      label: "1–2 days",
      detail: "Typically arrives within 1–2 days of the farmer confirming.",
      minDays: 1,
      maxDays: 2,
    },
  },
  {
    maxMiles: 100,
    window: {
      label: "2–3 days",
      detail: "Typically arrives within 2–3 days of the farmer confirming.",
      minDays: 2,
      maxDays: 3,
    },
  },
  {
    maxMiles: Number.POSITIVE_INFINITY,
    window: {
      label: "3–5 days",
      detail: "Longer haul — typically 3–5 days, depending on the farmer's terms.",
      minDays: 3,
      maxDays: 5,
    },
  },
];

/** Returns the estimated delivery window for a distance in miles. */
export function estimateDeliveryWindow(distanceMi: number | null | undefined): DeliveryWindow | null {
  if (distanceMi == null || Number.isNaN(distanceMi) || distanceMi < 0) return null;
  return (TIERS.find((t) => distanceMi <= t.maxMiles) ?? TIERS[TIERS.length - 1]).window;
}
