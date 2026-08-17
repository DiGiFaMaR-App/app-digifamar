/**
 * Farm profile — live-first read of `public_farms` plus that farm's own
 * `listings`.
 *
 * `/farm/$id` accepts either a sample-catalog farm slug (demo data) or a real
 * farmer account id (UUID). When the id resolves to a live farm we render the
 * real profile and the exact listings the farmer published; otherwise the page
 * falls back to the bundled sample farm and labels itself as demo data.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listingToProduct } from "@/lib/catalog/use-catalog";
import type { ListingRow } from "@/lib/catalog/catalog";
import type { Product } from "@/lib/mock-data";

export type LiveFarm = {
  id: string;
  name: string;
  location: string;
  description: string;
  certifications: string[];
  verified: boolean;
  lat: number | null;
  lng: number | null;
};

export type FarmProfile = { farm: LiveFarm; products: Product[] } | null;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isFarmId = (id: string) => UUID.test(id);

export async function fetchFarmProfile(id: string): Promise<FarmProfile> {
  if (!isFarmId(id)) return null;

  const { data: farm } = await supabase
    .from("public_farms")
    .select(
      "user_id, farm_name, description, city, state, certifications, verification_status, lat, lng",
    )
    .eq("user_id", id)
    .maybeSingle();
  if (!farm) return null;

  const { data: listings } = await supabase
    .from("listings")
    .select(PUBLIC_LISTING_COLUMNS)
    .eq("farmer_id", id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return {
    farm: {
      id: farm.user_id as string,
      name: (farm.farm_name as string) ?? "Farm",
      location: [farm.city, farm.state].filter(Boolean).join(", ") || "United States",
      description: (farm.description as string) ?? "",
      certifications: (farm.certifications as string[]) ?? [],
      verified: farm.verification_status === "verified",
      lat: (farm.lat as number | null) ?? null,
      lng: (farm.lng as number | null) ?? null,
    },
    products: ((listings ?? []) as ListingRow[]).map(listingToProduct),
  };
}

export function useFarmProfile(id: string) {
  return useQuery({
    queryKey: ["farm-profile", id],
    queryFn: () => fetchFarmProfile(id),
    enabled: isFarmId(id),
    staleTime: 60_000,
  });
}
