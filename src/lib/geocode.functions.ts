import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

const inputSchema = z.object({
  address: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(50).optional(),
  zip: z.string().trim().max(20).optional(),
  country: z.string().trim().max(50).default("USA"),
});

export type GeocodeResult = {
  lat: number;
  lng: number;
  formatted: string;
  city: string | null;
  state: string | null;
  zip: string | null;
} | null;

export const geocodeAddress = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<GeocodeResult> => {
    const parts = [data.address, data.city, data.state, data.zip, data.country]
      .filter(Boolean)
      .join(", ");
    if (!parts.trim()) return null;

    const lovableKey = process.env.LOVABLE_API_KEY;
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !mapsKey) {
      throw new Error("Missing Google Maps connector credentials");
    }

    const url = `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(parts)}&region=us`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": mapsKey,
      },
    });

    if (!res.ok) {
      throw new Error(`Geocoding failed: ${res.status}`);
    }

    const body = (await res.json()) as {
      status: string;
      results?: Array<{
        formatted_address: string;
        geometry: { location: { lat: number; lng: number } };
        address_components: Array<{
          long_name: string;
          short_name: string;
          types: string[];
        }>;
      }>;
    };

    if (body.status !== "OK" || !body.results?.length) return null;

    const top = body.results[0];
    const comp = (type: string, short = false) => {
      const found = top.address_components.find((c) => c.types.includes(type));
      return found ? (short ? found.short_name : found.long_name) : null;
    };

    return {
      lat: top.geometry.location.lat,
      lng: top.geometry.location.lng,
      formatted: top.formatted_address,
      city:
        comp("locality") ??
        comp("sublocality") ??
        comp("administrative_area_level_2"),
      state: comp("administrative_area_level_1", true),
      zip: comp("postal_code"),
    };
  });
