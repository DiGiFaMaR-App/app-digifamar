// Shared types + presentation constants for the DiGiFaMaR lender portal.
// Files prefixed with "-" are ignored by the TanStack Router file-route generator,
// so this module is safe to colocate inside src/routes/lenders without creating a route.

export const NAVY = {
  bg: "#0A0F1E",
  card: "#111827",
  accent: "#1D4ED8",
} as const;

export const INSTITUTION_TYPES = [
  { value: "bank", label: "Commercial Bank" },
  { value: "credit_union", label: "Credit Union" },
  { value: "farm_credit", label: "Farm Credit System" },
  { value: "cdfi", label: "CDFI / Community Lender" },
  { value: "fund", label: "Private Fund" },
  { value: "other", label: "Other" },
] as const;

export const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
] as const;

export type TradeScoreTier = "prime" | "strong" | "fair" | "watch";

export function scoreTier(score: number): TradeScoreTier {
  if (score >= 80) return "prime";
  if (score >= 65) return "strong";
  if (score >= 50) return "fair";
  return "watch";
}

export const TIER_META: Record<
  TradeScoreTier,
  { label: string; text: string; ring: string; bg: string; dot: string }
> = {
  prime: {
    label: "Prime",
    text: "#34D399",
    ring: "rgba(52,211,153,0.35)",
    bg: "rgba(52,211,153,0.10)",
    dot: "#34D399",
  },
  strong: {
    label: "Strong",
    text: "#60A5FA",
    ring: "rgba(96,165,250,0.35)",
    bg: "rgba(96,165,250,0.10)",
    dot: "#60A5FA",
  },
  fair: {
    label: "Fair",
    text: "#FBBF24",
    ring: "rgba(251,191,36,0.35)",
    bg: "rgba(251,191,36,0.10)",
    dot: "#FBBF24",
  },
  watch: {
    label: "Watch",
    text: "#F87171",
    ring: "rgba(248,113,113,0.35)",
    bg: "rgba(248,113,113,0.10)",
    dot: "#F87171",
  },
};

/** A row of public.farmer_lender_recommendations, joined with farm identity. */
export type RecommendedFarmer = {
  /** farmer user id (uuid) — used as the route param. */
  id: string;
  name: string;
  location: string;
  state: string;
  primaryProduct: string;
  tradeScore: number;
  twelveMonthSales: number;
  repeatBuyerPct: number;
  avgRating: number;
  recommendedAmount: number;
  reason: string;
};

/** A row of public.lender_applications, camel-cased for the admin queue. */
export type LenderApplication = {
  id: string;
  institutionName: string;
  institutionType: string;
  charterNumber: string;
  lendingStates: string[];
  minLoanAmount: number;
  maxLoanAmount: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  status: "pending" | "approved" | "rejected";
  reviewNotes: string;
  submittedAt: string;
};


export const institutionTypeLabel = (value: string) =>
  INSTITUTION_TYPES.find((t) => t.value === value)?.label ?? value;

export const fmtUSD = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n.toLocaleString()}`;

export const fmtUSDFull = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
