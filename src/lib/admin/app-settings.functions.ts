/**
 * App-wide settings (e.g. default Google Maps browser key).
 * Reads are public (table has a `SELECT USING (true)` policy).
 * Writes go through `setAppSettingFn`, which requires the admin role.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const KeyEnum = z.enum(["gmaps_browser_key"]);

// Validate values per-key. Google API keys are `AIza…` + 35 url-safe chars.
const ValueSchemas: Record<z.infer<typeof KeyEnum>, z.ZodString> = {
  gmaps_browser_key: z
    .string()
    .trim()
    .regex(/^AIza[0-9A-Za-z_-]{20,}$/, "Not a valid Google API key"),
};

export const getAppSettingFn = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ key: KeyEnum }).parse(input))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: row, error } = await sb
      .from("app_settings")
      .select("value, updated_at")
      .eq("key", data.key)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ?? null;
  });

export const setAppSettingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => {
    const parsed = z.object({ key: KeyEnum, value: z.string() }).parse(input);
    const value = ValueSchemas[parsed.key].parse(parsed.value);
    return { key: parsed.key, value };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isAdmin, error: roleErr } = await supabaseAdmin.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Forbidden");

    const { error } = await supabaseAdmin.from("app_settings").upsert(
      {
        key: data.key,
        value: data.value,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
