/**
 * Geocoding — CLIENT module (self-contained app).
 *
 * Calls the `geo` Supabase Edge Function (holds GOOGLE_API_KEY). Returns null
 * when geocoding isn't configured/available, so /browse and /near-me still work
 * (they just skip distance sorting). Export names/shapes kept for compatibility.
 */
import { supabase } from "@/integrations/supabase/client";

export type GeocodeResult = {
  lat: number;
  lng: number;
  formatted: string;
  city: string | null;
  state: string | null;
  zip: string | null;
} | null;

async function invokeGeo(payload: Record<string, unknown>): Promise<GeocodeResult> {
  try {
    const { data, error } = await supabase.functions.invoke("geo", { body: payload });
    if (error || !data || data.notConfigured) return null;
    return (data.result ?? null) as GeocodeResult;
  } catch {
    return null;
  }
}

export const geocodeAddress = ({
  data,
}: {
  data: { address?: string; city?: string; state?: string; zip?: string; country?: string };
}): Promise<GeocodeResult> => invokeGeo({ action: "geocode", ...data });

export const reverseGeocode = ({
  data,
}: {
  data: { lat: number; lng: number };
}): Promise<GeocodeResult> => invokeGeo({ action: "reverse", lat: data.lat, lng: data.lng });

export const geocodePlaceId = ({ data }: { data: { placeId: string } }): Promise<GeocodeResult> =>
  invokeGeo({ action: "place", placeId: data.placeId });
