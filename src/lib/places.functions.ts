/**
 * Server-side Google Places (New) details lookup.
 *
 * Prefers the Lovable Google Maps connector gateway; falls back to a direct
 * Places API (New) call using `GOOGLE_API_KEY` when the connector isn't
 * available (e.g. CodedSpace).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  placeId: z.string().trim().min(1).max(300),
  // Comma-separated Places API (New) field mask. Defaults to a safe minimal set.
  fields: z
    .string()
    .trim()
    .max(500)
    .default("id,displayName,formattedAddress,location,types,addressComponents"),
});

export type PlaceDetails = {
  id: string;
  displayName: string | null;
  formattedAddress: string | null;
  lat: number | null;
  lng: number | null;
  types: string[];
  addressComponents: Array<{ longText: string; shortText: string; types: string[] }>;
  raw: Record<string, unknown>;
} | null;

type PlacesNewResponse = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  types?: string[];
  addressComponents?: Array<{ longText?: string; shortText?: string; types?: string[] }>;
  error?: { message?: string; status?: string };
};

function shape(body: PlacesNewResponse): PlaceDetails {
  if (!body || !body.id) return null;
  return {
    id: body.id,
    displayName: body.displayName?.text ?? null,
    formattedAddress: body.formattedAddress ?? null,
    lat: body.location?.latitude ?? null,
    lng: body.location?.longitude ?? null,
    types: body.types ?? [],
    addressComponents: (body.addressComponents ?? []).map((c) => ({
      longText: c.longText ?? "",
      shortText: c.shortText ?? "",
      types: c.types ?? [],
    })),
    raw: body as unknown as Record<string, unknown>,
  };
}

export const getPlaceDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<PlaceDetails> => {
    const { fetchGoogleMaps } = await import("@/lib/gmaps-fetch.server");
    const path = `/places/v1/places/${encodeURIComponent(data.placeId)}`;
    const res = await fetchGoogleMaps(path, {
      method: "GET",
      headers: {
        "X-Goog-FieldMask": data.fields,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Place details failed: ${res.status}${text ? ` — ${text}` : ""}`);
    }
    const body = (await res.json()) as PlacesNewResponse;
    if (body.error) throw new Error(`Place details error: ${body.error.message ?? "unknown"}`);
    return shape(body);
  });
