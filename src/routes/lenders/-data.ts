// Shared types + mock data for the DiGiFaMaR lender portal.
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
  { value: "private_fund", label: "Private Fund" },
  { value: "other", label: "Other" },
] as const;

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
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
  prime: { label: "Prime", text: "#34D399", ring: "rgba(52,211,153,0.35)", bg: "rgba(52,211,153,0.10)", dot: "#34D399" },
  strong: { label: "Strong", text: "#60A5FA", ring: "rgba(96,165,250,0.35)", bg: "rgba(96,165,250,0.10)", dot: "#60A5FA" },
  fair: { label: "Fair", text: "#FBBF24", ring: "rgba(251,191,36,0.35)", bg: "rgba(251,191,36,0.10)", dot: "#FBBF24" },
  watch: { label: "Watch", text: "#F87171", ring: "rgba(248,113,113,0.35)", bg: "rgba(248,113,113,0.10)", dot: "#F87171" },
};

export type RecommendedFarmer = {
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
  yearsOnPlatform: number;
  reason: string;
};

export const recommendedFarmers: RecommendedFarmer[] = [
  {
    id: "blue-ridge",
    name: "Blue Ridge Family Farm",
    location: "Asheville, NC",
    state: "NC",
    primaryProduct: "Heirloom vegetables",
    tradeScore: 92,
    twelveMonthSales: 318_400,
    repeatBuyerPct: 71,
    avgRating: 4.9,
    recommendedAmount: 120_000,
    yearsOnPlatform: 4,
    reason: "Top-decile repeat buyer rate and four consecutive quarters of revenue growth.",
  },
  {
    id: "morning-glory",
    name: "Morning Glory Dairy",
    location: "Madison, WI",
    state: "WI",
    primaryProduct: "Creamline dairy",
    tradeScore: 88,
    twelveMonthSales: 402_900,
    repeatBuyerPct: 68,
    avgRating: 4.9,
    recommendedAmount: 150_000,
    yearsOnPlatform: 5,
    reason: "Highest absolute sales volume on the platform with stable seasonal demand.",
  },
  {
    id: "river-bend",
    name: "River Bend Produce",
    location: "Lancaster, PA",
    state: "PA",
    primaryProduct: "Organic vegetables",
    tradeScore: 81,
    twelveMonthSales: 241_750,
    repeatBuyerPct: 64,
    avgRating: 4.8,
    recommendedAmount: 90_000,
    yearsOnPlatform: 3,
    reason: "Consistent fulfillment record and expanding wholesale buyer base.",
  },
  {
    id: "sunrise-orchards",
    name: "Sunrise Orchards",
    location: "Walla Walla, WA",
    state: "WA",
    primaryProduct: "Stone fruit & apples",
    tradeScore: 74,
    twelveMonthSales: 196_300,
    repeatBuyerPct: 58,
    avgRating: 4.8,
    recommendedAmount: 70_000,
    yearsOnPlatform: 3,
    reason: "Strong seasonal peaks; recommend a revolving line sized to harvest cycle.",
  },
  {
    id: "homestead-hollow",
    name: "Homestead Hollow Farm",
    location: "Austin, TX",
    state: "TX",
    primaryProduct: "Mixed produce & eggs",
    tradeScore: 67,
    twelveMonthSales: 142_100,
    repeatBuyerPct: 52,
    avgRating: 4.9,
    recommendedAmount: 55_000,
    yearsOnPlatform: 2,
    reason: "Younger account with rising velocity; good candidate for a starter facility.",
  },
  {
    id: "golden-meadow",
    name: "Golden Meadow Apiary",
    location: "Bozeman, MT",
    state: "MT",
    primaryProduct: "Raw honey",
    tradeScore: 58,
    twelveMonthSales: 98_400,
    repeatBuyerPct: 47,
    avgRating: 4.7,
    recommendedAmount: 35_000,
    yearsOnPlatform: 2,
    reason: "Niche product with loyal but smaller buyer pool; size facility conservatively.",
  },
];

export function getRecommendedFarmer(id: string): RecommendedFarmer | undefined {
  return recommendedFarmers.find((f) => f.id === id);
}

const MONTHS = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];

// Deterministic 12-month sales series derived from the farmer's annual total,
// so every farmer profile renders a stable, plausible chart.
export function salesSeries(farmer: RecommendedFarmer) {
  const base = farmer.twelveMonthSales / 12;
  return MONTHS.map((month, i) => {
    const seasonal = 1 + 0.35 * Math.sin((i / 12) * Math.PI * 2 + farmer.tradeScore);
    const drift = 1 + (i / 12) * 0.18; // gentle upward trend
    return { month, sales: Math.round((base * seasonal * drift) / 100) * 100 };
  });
}

export function buyerBreakdown(farmer: RecommendedFarmer) {
  const total = farmer.twelveMonthSales;
  const repeat = Math.round(total * (farmer.repeatBuyerPct / 100));
  const wholesale = Math.round((total - repeat) * 0.55);
  const newRetail = total - repeat - wholesale;
  return [
    { name: "Repeat buyers", value: repeat, fill: "#1D4ED8" },
    { name: "Wholesale", value: wholesale, fill: "#60A5FA" },
    { name: "New retail", value: newRetail, fill: "#A5B4FC" },
  ];
}

export function ratingsHistory(farmer: RecommendedFarmer) {
  return MONTHS.map((month, i) => {
    const wobble = 0.18 * Math.sin((i / 12) * Math.PI * 2 + farmer.repeatBuyerPct);
    const rating = Math.max(4.2, Math.min(5, farmer.avgRating - 0.15 + wobble));
    return { month, rating: Number(rating.toFixed(2)) };
  });
}

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
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
};

export const pendingApplications: LenderApplication[] = [
  {
    id: "app-1042",
    institutionName: "Heartland Farm Credit",
    institutionType: "farm_credit",
    charterNumber: "FC-44821",
    lendingStates: ["IA", "IL", "NE", "MO", "KS"],
    minLoanAmount: 25_000,
    maxLoanAmount: 2_000_000,
    contactName: "Dana Whitfield",
    contactEmail: "dwhitfield@heartlandfc.com",
    status: "pending",
    submittedAt: "2026-05-29",
  },
  {
    id: "app-1043",
    institutionName: "Cascade Community Credit Union",
    institutionType: "credit_union",
    charterNumber: "CU-90112",
    lendingStates: ["WA", "OR", "ID"],
    minLoanAmount: 10_000,
    maxLoanAmount: 350_000,
    contactName: "Marcus Lindqvist",
    contactEmail: "mlindqvist@cascadeccu.org",
    status: "pending",
    submittedAt: "2026-05-30",
  },
  {
    id: "app-1044",
    institutionName: "Delta Green CDFI Fund",
    institutionType: "cdfi",
    charterNumber: "",
    lendingStates: ["MS", "LA", "AR", "AL"],
    minLoanAmount: 5_000,
    maxLoanAmount: 150_000,
    contactName: "Priya Anand",
    contactEmail: "priya@deltagreenfund.org",
    status: "pending",
    submittedAt: "2026-05-31",
  },
  {
    id: "app-1045",
    institutionName: "First Meridian Bank",
    institutionType: "bank",
    charterNumber: "OCC-22119",
    lendingStates: ["NC", "SC", "GA", "VA", "TN"],
    minLoanAmount: 50_000,
    maxLoanAmount: 5_000_000,
    contactName: "Robert Okafor",
    contactEmail: "rokafor@firstmeridian.com",
    status: "pending",
    submittedAt: "2026-05-31",
  },
];

export const institutionTypeLabel = (value: string) =>
  INSTITUTION_TYPES.find((t) => t.value === value)?.label ?? value;

export const fmtUSD = (n: number) =>
  n >= 1000
    ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
    : `$${n.toLocaleString()}`;

export const fmtUSDFull = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
