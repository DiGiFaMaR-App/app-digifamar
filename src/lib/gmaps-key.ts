/**
 * Resolves the active Google Maps browser API key for this site.
 * Priority (first hit wins):
 *   1. localStorage override (per-browser, set on /settings/maps)
 *   2. `gmaps_browser_key` row in `app_settings` (admin-managed, default for everyone)
 *   3. Lovable-managed connector key (works on *.lovable.app)
 *
 * Cached for the page lifetime so multiple maps share a single fetch.
 */
import { getPublicAppSettingFn } from "@/lib/admin/app-settings.functions";

const MANAGED_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as
  | string
  | undefined;

export const GMAPS_OVERRIDE_STORAGE_KEY = "dfm:gmaps_browser_key_override";

let cached: Promise<string | undefined> | null = null;

async function fetchAdminKey(): Promise<string | undefined> {
  try {
    const row = await getPublicAppSettingFn({ data: { key: "gmaps_browser_key" } });
    return (row?.value as string | undefined) || undefined;
  } catch {
    return undefined;
  }
}

export function resolveGoogleMapsKey(): Promise<string | undefined> {
  if (cached) return cached;
  cached = (async () => {
    if (typeof window !== "undefined") {
      const override = window.localStorage?.getItem(GMAPS_OVERRIDE_STORAGE_KEY);
      if (override) return override;
    }
    const admin = await fetchAdminKey();
    if (admin) return admin;
    return MANAGED_KEY;
  })();
  return cached;
}

/** Forces the next caller to re-fetch (use after admin updates the value). */
export function invalidateGoogleMapsKeyCache() {
  cached = null;
}
