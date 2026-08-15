/**
 * Catalog — data access (self-contained mobile app).
 *
 * Reads the marketplace catalog directly from Supabase via the anon key. The
 * `listings` SELECT policy makes active listings publicly readable (RLS), so no
 * server function / Edge Function is required for browse reads.
 */
import { supabase } from "@/integrations/supabase/client";
import { planRank } from "@/lib/entitlements/plans";
import type { Tables } from "@/integrations/supabase/types";

export type ListingRow = Tables<"listings">;

/**
 * Active listings, newest first, with paid-plan farmers surfaced ahead of free
 * ones (the "featured placement" entitlement of Pro and Elite). Placement is a
 * sort bias only — no listing is ever hidden because of a farmer's plan.
 */
export async function fetchActiveListings(): Promise<ListingRow[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return rows;

  const farmerIds = [...new Set(rows.map((r) => r.farmer_id).filter(Boolean))];
  const { data: farms } = await supabase
    .from("farmer_profiles")
    .select("user_id, plan")
    .in("user_id", farmerIds);

  const rank = new Map<string, number>();
  for (const f of farms ?? []) {
    const plan = (f as { plan?: string | null }).plan ?? "free";
    rank.set(f.user_id, planRank(plan === "elite" || plan === "pro" ? plan : "free"));
  }

  return [...rows].sort((a, b) => (rank.get(b.farmer_id) ?? 0) - (rank.get(a.farmer_id) ?? 0));
}

export async function fetchListingBySlug(slug: string): Promise<ListingRow | null> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}
