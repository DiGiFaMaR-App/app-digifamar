import { describe, expect, it } from "vitest";
import {
  computeDeliveryFee,
  computeFees,
  dollarsToCents,
  ESCROW_FEE_RATE,
  FREE_DELIVERY_RADIUS_MILES,
  formatCents,
  formatRate,
  PLATFORM_FEE_RATE,
} from "./fees";

describe("checkout fees", () => {
  it("uses an 8% platform fee and a 3.25% escrow fee", () => {
    expect(PLATFORM_FEE_RATE).toBe(0.08);
    expect(ESCROW_FEE_RATE).toBe(0.0325);
  });

  it("computes platform + escrow fees on the subtotal", () => {
    const f = computeFees(10_000); // $100.00
    expect(f.platformFeeCents).toBe(800); // 8%
    expect(f.escrowFeeCents).toBe(325); // 3.25%
    expect(f.totalCents).toBe(11_125);
  });

  it("rounds fees to the nearest cent", () => {
    const f = computeFees(550); // $5.50
    expect(f.platformFeeCents).toBe(44); // round(44.0)
    expect(f.escrowFeeCents).toBe(18); // round(17.875)
    expect(f.totalCents).toBe(550 + 44 + 18);
  });

  it("total always equals subtotal + all fees", () => {
    for (const subtotal of [0, 1, 999, 12_345, 9_999_999]) {
      for (const delivery of [0, 499, 2499]) {
        const f = computeFees(subtotal, delivery);
        expect(f.totalCents).toBe(
          f.subtotalCents + f.platformFeeCents + f.escrowFeeCents + f.deliveryFeeCents,
        );
      }
    }
  });

  it("folds the delivery fee into the total", () => {
    const f = computeFees(10_000, 799); // $100.00 + $7.99 delivery
    expect(f.deliveryFeeCents).toBe(799);
    expect(f.totalCents).toBe(11_125 + 799);
  });

  it("defaults the delivery fee to zero when omitted", () => {
    expect(computeFees(10_000).deliveryFeeCents).toBe(0);
  });

  it("clamps negative subtotals to zero", () => {
    expect(computeFees(-500).totalCents).toBe(0);
  });

  it("converts dollars to integer cents without float drift", () => {
    expect(dollarsToCents(5.5)).toBe(550);
    expect(dollarsToCents(0.1 + 0.2)).toBe(30);
  });

  it("formats cents and rates for display", () => {
    expect(formatCents(11_125)).toBe("$111.25");
    expect(formatRate(PLATFORM_FEE_RATE)).toBe("8%");
    expect(formatRate(ESCROW_FEE_RATE)).toBe("3.25%");
  });
});

describe("delivery fee", () => {
  it("is free for farm pickup regardless of distance", () => {
    expect(computeDeliveryFee(0, "pickup")).toBe(0);
    expect(computeDeliveryFee(250, "pickup")).toBe(0);
    expect(computeDeliveryFee(null, "pickup")).toBe(0);
  });

  it("charges only the base fee within the free radius", () => {
    expect(computeDeliveryFee(0, "standard")).toBe(499);
    expect(computeDeliveryFee(FREE_DELIVERY_RADIUS_MILES, "standard")).toBe(499);
    expect(computeDeliveryFee(FREE_DELIVERY_RADIUS_MILES, "express")).toBe(999);
  });

  it("adds a per-mile surcharge beyond the free radius", () => {
    // standard: 499 base + (30 - 10) miles * 35c = 499 + 700
    expect(computeDeliveryFee(30, "standard")).toBe(499 + 700);
    // express: 999 base + (30 - 10) miles * 60c = 999 + 1200
    expect(computeDeliveryFee(30, "express")).toBe(999 + 1200);
  });

  it("caps the fee for long-haul distances", () => {
    expect(computeDeliveryFee(100_000, "standard")).toBe(2499);
    expect(computeDeliveryFee(100_000, "express")).toBe(4999);
  });

  it("falls back to a flat fee when the distance is unknown", () => {
    expect(computeDeliveryFee(null, "standard")).toBe(899);
    expect(computeDeliveryFee(null, "express")).toBe(1799);
    expect(computeDeliveryFee(NaN, "standard")).toBe(899);
    expect(computeDeliveryFee(-5, "standard")).toBe(899);
  });
});
