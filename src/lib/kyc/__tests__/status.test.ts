import { describe, expect, it } from "vitest";
import { computeVerification, latestPerType } from "../status";

const doc = (doc_type: string, status: string, created_at: string) => ({
  doc_type,
  status,
  created_at,
});

describe("KYC resubmission status", () => {
  it("keeps only the newest document per type", () => {
    const docs = [
      doc("government_id", "rejected", "2026-01-01T00:00:00Z"),
      doc("government_id", "pending", "2026-02-01T00:00:00Z"),
    ];
    expect(latestPerType(docs)).toEqual([docs[1]]);
  });

  it("moves a rejected farmer back under review after a resubmission", () => {
    expect(
      computeVerification([
        doc("government_id", "rejected", "2026-01-01T00:00:00Z"),
        doc("government_id", "pending", "2026-02-01T00:00:00Z"),
        doc("proof_of_address", "approved", "2026-01-05T00:00:00Z"),
      ]),
    ).toBe("under_review");
  });

  it("stays rejected while another document is still rejected", () => {
    expect(
      computeVerification([
        doc("government_id", "pending", "2026-02-01T00:00:00Z"),
        doc("proof_of_address", "rejected", "2026-01-05T00:00:00Z"),
      ]),
    ).toBe("rejected");
  });

  it("is approved when every effective document is approved", () => {
    expect(
      computeVerification([
        doc("government_id", "rejected", "2026-01-01T00:00:00Z"),
        doc("government_id", "approved", "2026-03-01T00:00:00Z"),
      ]),
    ).toBe("approved");
  });
});
