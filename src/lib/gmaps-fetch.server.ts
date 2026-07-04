/**
 * Server-side Google Maps fetch helper.
 *
 * Prefers the Lovable connector gateway (auto-refreshed creds on lovable.app).
 * Falls back to a direct Google Maps call using `GOOGLE_API_KEY` when the
 * connector isn't present — this lets geocoding/places work in CodedSpace
 * and other non-Lovable environments.
 */

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";
const DIRECT_URL = "https://maps.googleapis.com";

type FetchInit = { method?: string; headers?: Record<string, string>; body?: BodyInit };

/**
 * Fetch a Google Maps endpoint. Pass `path` starting with `/` (e.g.
 * `/maps/api/geocode/json?address=...`). Extra query params for the fallback
 * path (like `key=...`) are appended automatically.
 */
export async function fetchGoogleMaps(path: string, init: FetchInit = {}): Promise<Response> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const connectorKey = process.env.GOOGLE_MAPS_API_KEY;

  if (lovableKey && connectorKey) {
    return fetch(`${GATEWAY_URL}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connectorKey,
      },
    });
  }

  const directKey = process.env.GOOGLE_API_KEY;
  if (!directKey) {
    throw new Error(
      "Google Maps unavailable: neither the Lovable connector (LOVABLE_API_KEY + GOOGLE_MAPS_API_KEY) nor GOOGLE_API_KEY is configured.",
    );
  }
  const sep = path.includes("?") ? "&" : "?";
  return fetch(`${DIRECT_URL}${path}${sep}key=${encodeURIComponent(directKey)}`, init);
}
