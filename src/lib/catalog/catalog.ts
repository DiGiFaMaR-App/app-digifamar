/**
 * Catalog — data access (self-contained mobile app).
 *
 * Reads the marketplace catalog directly from Supabase via the anon key. The
 * `listings` SELECT policy makes active listings publicly readable (RLS), so no
 * server function / Edge Function is required for browse reads.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ListingRow = Tables<"listings">;

export async function fetchActiveListings(): Promise<ListingRow[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
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
