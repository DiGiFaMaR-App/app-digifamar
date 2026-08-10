/**
 * App-wide settings — CLIENT module (self-contained app).
 *
 * Reads/writes the `app_settings` table directly.
 * `gmaps_browser_key*` entries are publishable browser keys with a public
 * SELECT policy; `gmaps_server_key:*` entries are private server geocoding
 * keys readable by admins only. All writes are admin-only via RLS.
 */
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  LEGACY_BROWSER_KEY_NAME,
  MAP_ENVIRONMENTS,
  browserKeyName,
  serverKeyName,
} from "@/lib/maps/env";

const GOOGLE_KEY = z
  .string()
  .trim()
  .regex(/^AIza[0-9A-Za-z_-]{20,}$/, "Not a valid Google API key");

const BROWSER_KEYS = MAP_ENVIRONMENTS.map(browserKeyName);
const SERVER_KEYS = MAP_ENVIRONMENTS.map(serverKeyName);

const PublicKeyEnum = z.enum([LEGACY_BROWSER_KEY_NAME, ...BROWSER_KEYS] as [string, ...string[]]);
const KeyEnum = z.enum([
  LEGACY_BROWSER_KEY_NAME,
  ...BROWSER_KEYS,
  ...SERVER_KEYS,
] as [string, ...string[]]);

async function readSetting(key: string) {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value, updated_at")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export const getPublicAppSettingFn = async ({ data }: { data: { key: string } }) => {
  const key = PublicKeyEnum.parse(data.key);
  return readSetting(key);
};

export const getAppSettingFn = async ({ data }: { data: { key: string } }) => {
  const key = KeyEnum.parse(data.key);
  return readSetting(key);
};

export const setAppSettingFn = async ({ data }: { data: { key: string; value: string } }) => {
  const key = KeyEnum.parse(data.key);
  const value = GOOGLE_KEY.parse(data.value);
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("app_settings")
    .upsert(
      { key, value, updated_by: auth.user?.id ?? null, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
  if (error) throw new Error(error.message);
  return { ok: true };
};

/** Removes a stored key so the build-time fallback takes over again. */
export const clearAppSettingFn = async ({ data }: { data: { key: string } }) => {
  const key = KeyEnum.parse(data.key);
  const { error } = await supabase.from("app_settings").update({ value: "" }).eq("key", key);
  if (error) throw new Error(error.message);
  return { ok: true };
};
