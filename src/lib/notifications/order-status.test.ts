import { afterEach, describe, expect, it, vi } from "vitest";
import { notifyBuyerOfStatus, statusCopy } from "./order-status.server";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("statusCopy", () => {
  it("includes the farm name and tracking details", () => {
    const copy = statusCopy("shipped", {
      farmName: "Green Acres",
      carrier: "UPS",
      trackingNumber: "1Z999",
    });
    expect(copy.sms).toContain("Green Acres");
    expect(copy.sms).toContain("UPS 1Z999");
    expect(copy.subject).toMatch(/on the way/i);
  });

  it("covers every step", () => {
    for (const s of ["placed", "packed", "shipped", "delivered"] as const) {
      expect(statusCopy(s, {}).sms.length).toBeGreaterThan(10);
    }
  });
});

describe("notifyBuyerOfStatus", () => {
  it("reports both channels as unsent when nothing is configured", async () => {
    vi.stubEnv("VONAGE_API_KEY", "");
    vi.stubEnv("VONAGE_API_SECRET", "");
    vi.stubEnv("VONAGE_FROM", "");
    vi.stubEnv("EMAIL_SENDER_DOMAIN", "");
    const res = await notifyBuyerOfStatus({
      orderId: "o1",
      status: "packed",
      buyerPhone: "+16673619136",
      buyerEmail: "buyer@example.com",
    });
    expect(res.sms.sent).toBe(false);
    expect(res.email).toEqual({ sent: false, reason: "email_not_configured" });
  });

  it("never throws when the buyer has no contact details", async () => {
    const res = await notifyBuyerOfStatus({ orderId: "o1", status: "delivered" });
    expect(res.sms.sent).toBe(false);
    expect(res.email.sent).toBe(false);
  });
});
