/**
 * App-wide settings — CLIENT module (self-contained app).
 *
 * Reads/writes the `app_settings` table directly. `gmaps_browser_key` is a
 * publishable key with a dedicated public SELECT policy; all other keys are
 * admin-only via the "Admin full-access" RLS. Export names/shapes preserved.
 */
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const KeyEnum = z.enum(["gmaps_browser_key"]);
const PublicKeyEnum = z.enum(["gmaps_browser_key"]);

const ValueSchemas: Record<z.infer<typeof KeyEnum>, z.ZodString> = {
  gmaps_browser_key: z
    .string()
    .trim()
    .regex(/^AIza[0-9A-Za-z_-]{20,}$/, "Not a valid Google API key"),
};

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
  const value = ValueSchemas[key].parse(data.value);
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
