/**
 * App-wide settings (e.g. default Google Maps browser key).
 *
 * The `app_settings` table is admin-only at the RLS layer. Public-safe values
 * are exposed through `getPublicAppSettingFn`, which whitelists keys that are
 * explicitly safe for unauthenticated reads. `getAppSettingFn` (admin UI) and
 * `setAppSettingFn` (writes) both require the admin role.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminRole } from "@/lib/admin/authorization";

const KeyEnum = z.enum(["gmaps_browser_key"]);

// Keys safe to expose to unauthenticated browsers. Anything not in this set
// can only be read by admins via `getAppSettingFn`.
const PublicKeyEnum = z.enum(["gmaps_browser_key"]);
const PUBLIC_KEYS = new Set<z.infer<typeof PublicKeyEnum>>(["gmaps_browser_key"]);

// Validate values per-key. Google API keys are `AIza…` + 35 url-safe chars.
const ValueSchemas: Record<z.infer<typeof KeyEnum>, z.ZodString> = {
  gmaps_browser_key: z
    .string()
    .trim()
    .regex(/^AIza[0-9A-Za-z_-]{20,}$/, "Not a valid Google API key"),
};

/** Public reader: only returns keys in the PUBLIC_KEYS whitelist. */
export const getPublicAppSettingFn = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ key: PublicKeyEnum }).parse(input))
  .handler(async ({ data }) => {
    if (!PUBLIC_KEYS.has(data.key)) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("app_settings")
      .select("value, updated_at")
      .eq("key", data.key)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ?? null;
  });

/** Admin reader: any key, caller must have the admin role. */
export const getAppSettingFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ key: KeyEnum }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdminRole(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
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
    await assertAdminRole(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logAudit } = await import("@/lib/audit/log.server");

    const { error } = await supabaseAdmin.from("app_settings").upsert(
      {
        key: data.key,
        value: data.value,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) {
      await logAudit({
        actorId: context.userId,
        actorRole: "admin",
        action: "admin.app_setting.update",
        resourceType: "app_setting",
        resourceId: data.key,
        outcome: "failure",
        metadata: { error: error.message },
      });
      throw new Error(error.message);
    }
    await logAudit({
      actorId: context.userId,
      actorRole: "admin",
      action: "admin.app_setting.update",
      resourceType: "app_setting",
      resourceId: data.key,
      // Do not log the value (it's a secret-ish API key); just record length.
      metadata: { value_length: data.value.length },
    });
    return { ok: true };
  });
