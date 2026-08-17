/**
 * Resolves the Google Maps browser API key for the current environment.
 *
 * Order of precedence:
 *   1. Admin-saved key for this environment (app_settings, e.g.
 *      `gmaps_browser_key:production`)
 *   2. Legacy single admin-saved key (`gmaps_browser_key`)
 *   3. Build-time key injected by the Lovable Google Maps connector
 */
import { supabase } from "@/integrations/supabase/client";
import {
  LEGACY_BROWSER_KEY_NAME,
  browserKeyName,
  currentMapEnvironment,
} from "@/lib/maps/env";

const MANAGED_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as
  | string
  | undefined;

const STORED_KEY_TIMEOUT_MS = 2_500;

export const GMAPS_OVERRIDE_STORAGE_KEY = "dfm:gmaps_browser_key_override";

let cached: Promise<string | undefined> | null = null;

async function fetchStoredKey(): Promise<string | undefined> {
  try {
    const names = [browserKeyName(currentMapEnvironment()), LEGACY_BROWSER_KEY_NAME];
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", names);
    if (error || !data?.length) return undefined;
    for (const name of names) {
      const hit = data.find((row) => row.key === name);
      const value = hit?.value?.trim();
      if (value) return value;
    }
  } catch {
    /* fall through to the build-time key */
  }
  return undefined;
}

export function resolveGoogleMapsKey(): Promise<string | undefined> {
  // The project key (GOOGLE_API_KEY, injected at build time) is authoritative.
  if (MANAGED_KEY) return Promise.resolve(MANAGED_KEY);
  if (typeof window === "undefined") return Promise.resolve(MANAGED_KEY);
  if (!cached) {
    cached = Promise.race([
      fetchStoredKey(),
      new Promise<undefined>((resolve) => {
        window.setTimeout(() => resolve(undefined), STORED_KEY_TIMEOUT_MS);
      }),
    ]).then((stored) => stored ?? MANAGED_KEY);
  }
  return cached;
}

/** Forces the next resolve() to re-read the saved key (after saving one). */
export function invalidateGoogleMapsKeyCache() {
  cached = null;
}
