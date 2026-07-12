/**
 * Google Places details — CLIENT module (self-contained app).
 *
 * Calls the `geo` Supabase Edge Function (action "place"), which holds
 * GOOGLE_API_KEY. Returns null when unavailable. Shape kept for compatibility.
 */
import { supabase } from "@/integrations/supabase/client";

export type PlaceDetails = {
  id: string;
  displayName: string | null;
  formattedAddress: string | null;
  lat: number | null;
  lng: number | null;
  types: string[];
  addressComponents: Array<{ longText: string; shortText: string; types: string[] }>;
} | null;

export const getPlaceDetails = async ({
  data,
}: {
  data: { placeId: string; fields?: string };
}): Promise<PlaceDetails> => {
  try {
    const { data: res, error } = await supabase.functions.invoke("geo", {
      body: { action: "place", placeId: data.placeId, fields: data.fields },
    });
    if (error || !res || res.notConfigured) return null;
    return (res.result ?? null) as PlaceDetails;
  } catch {
    return null;
  }
};
