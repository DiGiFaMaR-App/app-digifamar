/**
 * Google Maps key health checks (admin-only) — thin server-function wrapper.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MAP_ENVIRONMENTS, browserKeyName, serverKeyName, LEGACY_BROWSER_KEY_NAME } from "./env";
import type { KeyHealth } from "./key-health.server";

export type { KeyCheck, KeyHealth, KeyStatus } from "./key-health.server";

export const checkMapKeyHealthFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ env: z.enum(MAP_ENVIRONMENTS), referrer: z.string().url().optional() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<KeyHealth> => {
    const { DEFAULT_REFERRER, maskKey, checkBrowserKey, checkServerKey } = await import(
      "./key-health.server"
    );

    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admins only");

    const { data: rows } = await context.supabase
      .from("app_settings")
      .select("key, value")
      .in("key", [browserKeyName(data.env), LEGACY_BROWSER_KEY_NAME, serverKeyName(data.env)]);

    const pick = (name: string) => rows?.find((r) => r.key === name)?.value?.trim() || null;

    const savedBrowser = pick(browserKeyName(data.env)) ?? pick(LEGACY_BROWSER_KEY_NAME);
    const savedServer = pick(serverKeyName(data.env));
    const fallback = process.env.GOOGLE_API_KEY ?? null;

    const browserKey = savedBrowser ?? fallback;
    const serverKey = savedServer ?? fallback;
    const referrer = data.referrer ?? DEFAULT_REFERRER[data.env] ?? "https://app.digifamar.com/";

    return {
      environment: data.env,
      referrer,
      browser: {
        source: savedBrowser ? "saved" : browserKey ? "fallback" : "none",
        masked: maskKey(browserKey),
        ...(await checkBrowserKey(browserKey, referrer)),
      },
      server: {
        source: savedServer ? "saved" : serverKey ? "fallback" : "none",
        masked: maskKey(serverKey),
        ...(await checkServerKey(serverKey)),
      },
    };
  });
