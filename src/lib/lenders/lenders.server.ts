/**
 * Lender portal server logic (service-role). Server-only: this module is never
 * bundled for the client.
 *
 * NOTHING HERE MOVES MONEY. The only state changes are:
 *  - recording a human admin's approve/reject decision on an application,
 *  - provisioning the lender's read-only portal account after that human
 *    decision,
 *  - recomputing informational farmer scores from marketplace data.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  computeTradeScore,
  scoreReason,
  type ScoreInputs,
} from "@/lib/lenders/recommendations";

export async function assertAdmin(userId: string): Promise<void> {
  if (!userId) throw new Error("Forbidden");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

async function grantLenderRole(userId: string): Promise<void> {
  await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "lender" });
}

/** Create (or refresh) the lender_profiles row for an approved application. */
async function provisionProfile(
  application: {
    id: string;
    institution_name: string;
    institution_type: string;
    charter_number: string | null;
    lending_states: string[];
    min_loan_amount: number;
    max_loan_amount: number;
    contact_name: string | null;
    contact_email: string;
    contact_phone: string | null;
  },
  userId: string,
): Promise<void> {
  const { error } = await supabaseAdmin.from("lender_profiles").upsert(
    {
      user_id: userId,
      application_id: application.id,
      institution_name: application.institution_name,
      institution_type: application.institution_type,
      charter_number: application.charter_number,
      lending_states: application.lending_states ?? [],
      min_loan_amount: application.min_loan_amount,
      max_loan_amount: application.max_loan_amount,
      contact_name: application.contact_name,
      contact_phone: application.contact_phone,
      status: "active",
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
  await grantLenderRole(userId);
}

export type DecisionResult = {
  ok: true;
  status: "approved" | "rejected";
  /** True when a lender_profiles row was created immediately. */
  provisioned: boolean;
  message: string;
};

/**
 * Records a HUMAN admin decision on a lender application. Approval only grants
 * read-only portal access — it never disburses funds or creates a loan.
 */
export async function decideApplication(input: {
  applicationId: string;
  status: "approved" | "rejected";
  reviewNotes?: string | null;
  actorId: string;
}): Promise<DecisionResult> {
  const { data: app, error: readErr } = await supabaseAdmin
    .from("lender_applications")
    .select("*")
    .eq("id", input.applicationId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!app) throw new Error("Application not found");

  const { error: updErr } = await supabaseAdmin
    .from("lender_applications")
    .update({
      status: input.status,
      review_notes: input.reviewNotes ?? null,
      reviewed_by: input.actorId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.applicationId);
  if (updErr) throw new Error(updErr.message);

  if (input.status !== "approved") {
    return { ok: true, status: "rejected", provisioned: false, message: "Application rejected." };
  }

  // Link the approval to an existing DiGiFaMaR account with the same contact
  // email. If the institution has not signed up yet, the profile is created on
  // their first sign-in (see ensureLenderProfileForUser).
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .ilike("email", app.contact_email)
    .maybeSingle();

  if (!profile) {
    return {
      ok: true,
      status: "approved",
      provisioned: false,
      message: `Approved. No account yet for ${app.contact_email} — their lender profile will be created automatically the first time they sign in with that email.`,
    };
  }

  await provisionProfile(app, profile.id);
  return {
    ok: true,
    status: "approved",
    provisioned: true,
    message: "Approved and lender portal access granted.",
  };
}

/** Called after a lender signs in: creates their profile if an approved application matches. */
export async function ensureLenderProfileForUser(
  userId: string,
  email: string | null,
): Promise<{ provisioned: boolean }> {
  const { data: existing } = await supabaseAdmin
    .from("lender_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return { provisioned: false };
  if (!email) return { provisioned: false };

  const { data: app } = await supabaseAdmin
    .from("lender_applications")
    .select("*")
    .eq("status", "approved")
    .ilike("contact_email", email)
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!app) return { provisioned: false };

  await provisionProfile(app, userId);
  return { provisioned: true };
}

type OrderRow = {
  buyer_id: string;
  farmer_id: string;
  total_cents: number;
  status: string;
  created_at: string;
  updated_at: string;
  delivery_deadline: string | null;
};

const COMPLETED = new Set(["delivered", "released"]);
const UNSETTLED = new Set(["pending", "cancelled"]);

/**
 * Recomputes global (lender_id IS NULL) informational recommendations from real
 * marketplace data. Display-only output — no disbursement is triggered.
 */
export async function recomputeRecommendations(): Promise<{ farmers: number }> {
  const since = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString();

  const { data: orders, error: ordErr } = await supabaseAdmin
    .from("orders")
    .select("buyer_id, farmer_id, total_cents, status, created_at, updated_at, delivery_deadline")
    .gte("created_at", since);
  if (ordErr) throw new Error(ordErr.message);

  const { data: reviews, error: revErr } = await supabaseAdmin
    .from("reviews")
    .select("farmer_id, rating");
  if (revErr) throw new Error(revErr.message);

  const byFarmer = new Map<string, OrderRow[]>();
  for (const o of (orders ?? []) as OrderRow[]) {
    const list = byFarmer.get(o.farmer_id) ?? [];
    list.push(o);
    byFarmer.set(o.farmer_id, list);
  }

  const ratings = new Map<string, { sum: number; n: number }>();
  for (const r of reviews ?? []) {
    const cur = ratings.get(r.farmer_id) ?? { sum: 0, n: 0 };
    cur.sum += r.rating;
    cur.n += 1;
    ratings.set(r.farmer_id, cur);
  }

  const rows: Array<Record<string, unknown>> = [];

  for (const [farmerId, list] of byFarmer) {
    const settled = list.filter((o) => !UNSETTLED.has(o.status));
    let onTime = 0;
    let late = 0;
    for (const o of settled) {
      if (!COMPLETED.has(o.status)) continue;
      if (o.delivery_deadline && new Date(o.updated_at) > new Date(o.delivery_deadline)) late += 1;
      else onTime += 1;
    }

    const revenueOrders = settled;
    const twelveMonthSales = revenueOrders.reduce((s, o) => s + (o.total_cents ?? 0), 0) / 100;

    // Repeat-buyer share of revenue: revenue from buyers with 2+ settled orders.
    const perBuyer = new Map<string, { orders: number; cents: number }>();
    for (const o of revenueOrders) {
      const cur = perBuyer.get(o.buyer_id) ?? { orders: 0, cents: 0 };
      cur.orders += 1;
      cur.cents += o.total_cents ?? 0;
      perBuyer.set(o.buyer_id, cur);
    }
    const totalCents = revenueOrders.reduce((s, o) => s + (o.total_cents ?? 0), 0);
    const repeatCents = Array.from(perBuyer.values())
      .filter((b) => b.orders >= 2)
      .reduce((s, b) => s + b.cents, 0);
    const repeatBuyerPct = totalCents > 0 ? Math.round((repeatCents / totalCents) * 100) : 0;

    const rat = ratings.get(farmerId) ?? { sum: 0, n: 0 };
    const avgRating = rat.n > 0 ? rat.sum / rat.n : 0;

    const inputs: ScoreInputs = {
      settledOrders: settled.length,
      onTimeCompletions: onTime,
      lateCompletions: late,
      avgRating,
      reviewCount: rat.n,
      twelveMonthSales,
    };
    const breakdown = computeTradeScore(inputs);

    rows.push({
      farmer_id: farmerId,
      lender_id: null,
      trade_score: breakdown.tradeScore,
      twelve_month_sales: Math.round(twelveMonthSales),
      repeat_buyer_pct: repeatBuyerPct,
      avg_rating: Number(avgRating.toFixed(2)),
      recommended_amount: breakdown.recommendedAmount,
      reason: scoreReason(inputs, breakdown),
      updated_at: new Date().toISOString(),
    });
  }

  // Replace the global set atomically enough for an advisory dataset.
  const { error: delErr } = await supabaseAdmin
    .from("farmer_lender_recommendations")
    .delete()
    .is("lender_id", null);
  if (delErr) throw new Error(delErr.message);

  if (rows.length) {
    const { error: insErr } = await supabaseAdmin
      .from("farmer_lender_recommendations")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(rows as any);
    if (insErr) throw new Error(insErr.message);
  }

  return { farmers: rows.length };
}

export async function assertLenderOrAdmin(userId: string): Promise<void> {
  if (!userId) throw new Error("Forbidden");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "lender"]);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Forbidden");
}

const MONTH_LABEL = (d: Date) => d.toLocaleString("en-US", { month: "short" });

/**
 * Real underwriting-research detail for one farmer: monthly sales, buyer mix and
 * rating history computed from actual orders/reviews. Read-only.
 */
export async function getFarmerLendingDetail(farmerId: string) {
  const since = new Date(Date.now() - 365 * 24 * 3600 * 1000);

  const [{ data: rec }, { data: profile }, { data: orders }, { data: reviews }] = await Promise.all(
    [
      supabaseAdmin
        .from("farmer_lender_recommendations")
        .select("*")
        .eq("farmer_id", farmerId)
        .is("lender_id", null)
        .maybeSingle(),
      supabaseAdmin
        .from("farmer_profiles")
        .select("user_id, farm_name, city, state, products, created_at, verification_status")
        .eq("user_id", farmerId)
        .maybeSingle(),
      supabaseAdmin
        .from("orders")
        .select("buyer_id, total_cents, status, created_at, updated_at, delivery_deadline")
        .eq("farmer_id", farmerId)
        .gte("created_at", since.toISOString()),
      supabaseAdmin
        .from("reviews")
        .select("rating, created_at")
        .eq("farmer_id", farmerId)
        .gte("created_at", since.toISOString()),
    ],
  );

  if (!profile) throw new Error("Farmer not found");

  const buckets: { key: string; month: string; sales: number; ratingSum: number; n: number }[] = [];
  const index = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    index.set(key, buckets.length);
    buckets.push({ key, month: MONTH_LABEL(d), sales: 0, ratingSum: 0, n: 0 });
  }

  const settled = (orders ?? []).filter((o) => !UNSETTLED.has(o.status));
  for (const o of settled) {
    const d = new Date(o.created_at);
    const i = index.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i !== undefined) buckets[i]!.sales += (o.total_cents ?? 0) / 100;
  }
  for (const r of reviews ?? []) {
    const d = new Date(r.created_at);
    const i = index.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i !== undefined) {
      buckets[i]!.ratingSum += r.rating;
      buckets[i]!.n += 1;
    }
  }

  const perBuyer = new Map<string, { orders: number; cents: number }>();
  for (const o of settled) {
    const cur = perBuyer.get(o.buyer_id) ?? { orders: 0, cents: 0 };
    cur.orders += 1;
    cur.cents += o.total_cents ?? 0;
    perBuyer.set(o.buyer_id, cur);
  }
  let repeat = 0;
  let first = 0;
  for (const b of perBuyer.values()) {
    if (b.orders >= 2) repeat += b.cents;
    else first += b.cents;
  }

  // Recompute the score components for the breakdown UI (same formula as the
  // stored recommendation row).
  let onTime = 0;
  let late = 0;
  for (const o of settled as Array<{
    status: string;
    updated_at: string;
    delivery_deadline: string | null;
  }>) {
    if (!COMPLETED.has(o.status)) continue;
    if (o.delivery_deadline && new Date(o.updated_at) > new Date(o.delivery_deadline)) late += 1;
    else onTime += 1;
  }
  const scoreInputs: ScoreInputs = {
    settledOrders: settled.length,
    onTimeCompletions: onTime,
    lateCompletions: late,
    avgRating: (reviews ?? []).length
      ? (reviews ?? []).reduce((s, r) => s + r.rating, 0) / (reviews ?? []).length
      : 0,
    reviewCount: (reviews ?? []).length,
    twelveMonthSales: settled.reduce((s, o) => s + (o.total_cents ?? 0), 0) / 100,
  };
  const breakdown = computeTradeScore(scoreInputs);

  return {
    farmerId,
    components: {
      fulfillment: Math.round(breakdown.fulfillment),
      rating: Math.round(breakdown.rating),
      volume: Math.round(breakdown.volume),
    },
    farmName: profile.farm_name,
    city: profile.city,
    state: profile.state,
    products: profile.products ?? [],
    memberSince: profile.created_at,
    verificationStatus: profile.verification_status,
    tradeScore: rec?.trade_score ?? 0,
    twelveMonthSales: Number(rec?.twelve_month_sales ?? 0),
    repeatBuyerPct: Number(rec?.repeat_buyer_pct ?? 0),
    avgRating: Number(rec?.avg_rating ?? 0),
    recommendedAmount: Number(rec?.recommended_amount ?? 0),
    reason: rec?.reason ?? null,
    salesSeries: buckets.map((b) => ({ month: b.month, sales: Math.round(b.sales) })),
    ratingSeries: buckets
      .filter((b) => b.n > 0)
      .map((b) => ({ month: b.month, rating: Number((b.ratingSum / b.n).toFixed(2)) })),
    buyerMix: [
      { name: "Repeat buyers", value: Math.round(repeat / 100), fill: "#1D4ED8" },
      { name: "First-time buyers", value: Math.round(first / 100), fill: "#60A5FA" },
    ],
    orderCount: settled.length,
    reviewCount: (reviews ?? []).length,
  };
}
