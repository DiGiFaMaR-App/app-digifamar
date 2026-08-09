/**
 * Farm detail read used by the map drawer.
 *
 * Kept as shared `queryOptions` so the map can prefetch a farm as soon as the
 * URL contains `?farm=<id>` and the drawer can render instantly from cache.
 */
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FarmDetail = {
  user_id: string;
  farm_name: string;
  description: string | null;
  city: string | null;
  state: string | null;
  certifications: string[];
  verification_status: string;
  lat: number | null;
  lng: number | null;
};

export async function fetchFarmDetail(farmId: string): Promise<FarmDetail | null> {
  const { data, error } = await supabase
    .from("public_farms")
    .select(
      "user_id, farm_name, description, city, state, lat, lng, certifications, verification_status",
    )
    .eq("user_id", farmId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    ...(data as FarmDetail),
    certifications: (data as FarmDetail).certifications ?? [],
  };
}

export const farmDetailQueryOptions = (farmId: string) =>
  queryOptions({
    queryKey: ["farm-detail", farmId],
    queryFn: () => fetchFarmDetail(farmId),
    staleTime: 5 * 60_000,
  });
