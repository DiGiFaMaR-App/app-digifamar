/**
 * Resolves the Lovable-managed Google Maps browser API key.
 * There is no per-browser or admin override any more — the key is provided by
 * the Lovable Google Maps connector and is referrer-restricted to
 * *.lovable.app / *.lovableproject.com.
 */
const MANAGED_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as
  | string
  | undefined;

export const GMAPS_OVERRIDE_STORAGE_KEY = "dfm:gmaps_browser_key_override";

export function resolveGoogleMapsKey(): Promise<string | undefined> {
  return Promise.resolve(MANAGED_KEY);
}

/** Kept for API compatibility; the managed key is static per build. */
export function invalidateGoogleMapsKeyCache() {
  /* no-op */
}
