// Geocoding / Places Edge Function (Google Maps server key).
//
// Ported from src/lib/geocode.functions.ts + places.functions.ts. Reads
// GOOGLE_API_KEY from the Supabase secret store. Actions:
//   geocode  { address?, city?, state?, zip?, country? }
//   reverse  { lat, lng }
//   place    { placeId, fields? }
//
// Returns { notConfigured: true } when no key is set, so callers can degrade.
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";

const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const PLACES_URL = "https://places.googleapis.com/v1/places";

type Comp = { long_name: string; short_name: string; types: string[] };

function parseTop(body: {
  status?: string;
  results?: Array<{
    formatted_address: string;
    geometry: { location: { lat: number; lng: number } };
    address_components: Comp[];
  }>;
}) {
  if (body.status !== "OK" || !body.results?.length) return null;
  const top = body.results[0];
  const comp = (type: string, short = false) => {
    const f = top.address_components.find((c) => c.types.includes(type));
    return f ? (short ? f.short_name : f.long_name) : null;
  };
  return {
    lat: top.geometry.location.lat,
    lng: top.geometry.location.lng,
    formatted: top.formatted_address,
    city: comp("locality") ?? comp("sublocality") ?? comp("administrative_area_level_2"),
    state: comp("administrative_area_level_1", true),
    zip: comp("postal_code"),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);
  try {
    const key = Deno.env.get("GOOGLE_API_KEY");
    if (!key) return jsonResponse({ notConfigured: true, result: null });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    if (action === "geocode") {
      const parts = [body.address, body.city, body.state, body.zip, body.country ?? "USA"]
        .filter(Boolean)
        .join(", ");
      if (!parts.trim()) return jsonResponse({ result: null });
      const res = await fetch(`${GEOCODE_URL}?address=${encodeURIComponent(parts)}&region=us&key=${key}`);
      if (!res.ok) return errorResponse(`Geocoding failed: ${res.status}`, 502);
      return jsonResponse({ result: parseTop(await res.json()) });
    }

    if (action === "reverse") {
      const { lat, lng } = body;
      if (typeof lat !== "number" || typeof lng !== "number") return errorResponse("lat/lng required", 400);
      const res = await fetch(`${GEOCODE_URL}?latlng=${lat},${lng}&key=${key}`);
      if (!res.ok) return errorResponse(`Reverse geocoding failed: ${res.status}`, 502);
      return jsonResponse({ result: parseTop(await res.json()) });
    }

    if (action === "place") {
      const placeId = String(body.placeId ?? "");
      if (!placeId) return errorResponse("placeId required", 400);
      const fields =
        typeof body.fields === "string" && body.fields
          ? body.fields
          : "id,displayName,formattedAddress,location,types,addressComponents";
      const res = await fetch(`${PLACES_URL}/${encodeURIComponent(placeId)}`, {
        headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": fields, Accept: "application/json" },
      });
      if (!res.ok) return errorResponse(`Place details failed: ${res.status}`, 502);
      const p = await res.json();
      if (!p?.id) return jsonResponse({ result: null });
      return jsonResponse({
        result: {
          id: p.id,
          displayName: p.displayName?.text ?? null,
          formattedAddress: p.formattedAddress ?? null,
          lat: p.location?.latitude ?? null,
          lng: p.location?.longitude ?? null,
          types: p.types ?? [],
          addressComponents: (p.addressComponents ?? []).map((c: { longText?: string; shortText?: string; types?: string[] }) => ({
            longText: c.longText ?? "",
            shortText: c.shortText ?? "",
            types: c.types ?? [],
          })),
        },
      });
    }

    return errorResponse(`Unknown action: ${action}`, 400);
  } catch (e) {
    return errorResponse((e as Error)?.message ?? "geo error", 400);
  }
});
