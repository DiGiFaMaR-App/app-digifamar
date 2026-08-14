import { describe, expect, it } from "vitest";
import { estimateDeliveryWindow } from "./delivery-window";

describe("estimateDeliveryWindow", () => {
  it("returns null without a distance", () => {
    expect(estimateDeliveryWindow(null)).toBeNull();
    expect(estimateDeliveryWindow(undefined)).toBeNull();
  });

  it("buckets by distance", () => {
    expect(estimateDeliveryWindow(5)?.label).toBe("Same day");
    expect(estimateDeliveryWindow(30)?.label).toBe("1–2 days");
    expect(estimateDeliveryWindow(80)?.label).toBe("2–3 days");
    expect(estimateDeliveryWindow(400)?.label).toBe("3–5 days");
  });

  it("orders minDays ascending with distance", () => {
    const near = estimateDeliveryWindow(5)!;
    const far = estimateDeliveryWindow(400)!;
    expect(near.minDays).toBeLessThan(far.minDays);
  });
});
