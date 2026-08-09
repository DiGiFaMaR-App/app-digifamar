import { describe, expect, it } from "vitest";
import { rollUpVerification } from "../kyc.functions";

describe("rollUpVerification", () => {
  it("is pending with no documents", () => {
    expect(rollUpVerification([])).toBe("pending");
  });
  it("is approved only when every document is approved", () => {
    expect(rollUpVerification(["approved", "approved"])).toBe("approved");
  });
  it("is rejected when any document is rejected", () => {
    expect(rollUpVerification(["approved", "rejected", "pending"])).toBe("rejected");
  });
  it("is under review while documents are still pending", () => {
    expect(rollUpVerification(["approved", "pending"])).toBe("under_review");
  });
});
