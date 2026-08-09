/**
 * Shared KYC verification status rules.
 *
 * A farmer may re-upload a document after it was rejected. The newest document
 * of a given type supersedes older ones, so verification is always computed
 * from the latest document per type — that is what lets a resubmission move a
 * rejected farmer back into review.
 */
export type VerificationStatus = "pending" | "under_review" | "approved" | "rejected";

export type KycDocLike = {
  doc_type: string;
  status: string;
  created_at: string;
};

/** Overall verification derived from a set of document statuses. */
export function rollUpVerification(statuses: string[]): VerificationStatus {
  if (statuses.length === 0) return "pending";
  if (statuses.includes("rejected")) return "rejected";
  if (statuses.every((s) => s === "approved")) return "approved";
  return "under_review";
}

/** Newest document per doc_type — older ones are treated as superseded. */
export function latestPerType<T extends KycDocLike>(docs: T[]): T[] {
  const byType = new Map<string, T>();
  for (const d of docs) {
    const current = byType.get(d.doc_type);
    if (!current || new Date(d.created_at) > new Date(current.created_at)) {
      byType.set(d.doc_type, d);
    }
  }
  return [...byType.values()];
}

/** Verification status computed from the farmer's effective document set. */
export function computeVerification(docs: KycDocLike[]): VerificationStatus {
  return rollUpVerification(latestPerType(docs).map((d) => d.status));
}
