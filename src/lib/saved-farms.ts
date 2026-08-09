/**
 * Saved (favorite) farms — signed-in only.
 *
 * Rows live in `public.saved_farms` (RLS scoped to auth.uid()), and the farm
 * display data is read from the public `public_farms` view.
 */
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type SavedFarm = {
  farm_id: string;
  saved_at: string;
  farm_name: string;
  description: string | null;
  city: string | null;
  state: string | null;
  certifications: string[];
  verification_status: string;
  lat: number | null;
  lng: number | null;
};

export async function fetchSavedFarms(): Promise<SavedFarm[]> {
  const { data: rows, error } = await supabase
    .from("saved_farms")
    .select("farm_id, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const ids = (rows ?? []).map((r) => r.farm_id);
  if (ids.length === 0) return [];

  const { data: farms, error: farmErr } = await supabase
    .from("public_farms")
    .select(
      "user_id, farm_name, description, city, state, lat, lng, certifications, verification_status",
    )
    .in("user_id", ids);
  if (farmErr) throw new Error(farmErr.message);

  const byId = new Map((farms ?? []).map((f) => [f.user_id as string, f]));
  return (rows ?? [])
    .map((r) => {
      const f = byId.get(r.farm_id) as Record<string, unknown> | undefined;
      if (!f) return null;
      return {
        farm_id: r.farm_id,
        saved_at: r.created_at,
        farm_name: (f['farm_name'] as string) ?? "Farm",
        description: (f['description'] as string | null) ?? null,
        city: (f['city'] as string | null) ?? null,
        state: (f['state'] as string | null) ?? null,
        certifications: (f['certifications'] as string[] | null) ?? [],
        verification_status: (f['verification_status'] as string) ?? "pending",
        lat: (f['lat'] as number | null) ?? null,
        lng: (f['lng'] as number | null) ?? null,
      } satisfies SavedFarm;
    })
    .filter((f): f is SavedFarm => f !== null);
}

export const savedFarmsQueryOptions = () =>
  queryOptions({
    queryKey: ["saved-farms"],
    queryFn: fetchSavedFarms,
    staleTime: 60_000,
  });

/** Ids only — cheap lookup used by heart buttons. */
export function useSavedFarmIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["saved-farm-ids", user?.id ?? null],
    enabled: Boolean(user?.id),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("saved_farms").select("farm_id");
      if (error) throw new Error(error.message);
      return new Set((data ?? []).map((r) => r.farm_id as string));
    },
  });
}

export function useToggleSavedFarm() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ farmId, saved }: { farmId: string; saved: boolean }) => {
      if (!user?.id) throw new Error("Sign in to save farms");
      if (saved) {
        const { error } = await supabase
          .from("saved_farms")
          .delete()
          .eq("farm_id", farmId)
          .eq("user_id", user.id);
        if (error) throw new Error(error.message);
        return { saved: false };
      }
      const { error } = await supabase
        .from("saved_farms")
        .insert({ farm_id: farmId, user_id: user.id });
      if (error) throw new Error(error.message);
      return { saved: true };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["saved-farm-ids"] });
      void queryClient.invalidateQueries({ queryKey: ["saved-farms"] });
    },
  });
}
