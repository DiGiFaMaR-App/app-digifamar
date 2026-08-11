/**
 * Google Maps key health checks (admin-only).
 *
 * Verifies, per environment, that:
 *   - the browser key loads a Maps static tile for the given referrer
 *   - the server geocoding key can run a Geocoding API request
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MAP_ENVIRONMENTS, browserKeyName, serverKeyName, LEGACY_BROWSER_KEY_NAME } from "./env";

export type KeyCheck = {
  source: "saved" | "fallback" | "none";
  masked: string | null;
  status: "valid" | "invalid" | "missing";
  detail: string;
};

export type KeyHealth = {
  environment: string;
  referrer: string;
  browser: KeyCheck;
  server: KeyCheck;
};

const Input = z.object({
  env: z.enum(MAP_ENVIRONMENTS),
  referrer: z.string().url().optional(),
});

const DEFAULT_REFERRER: Record<string, string> = {
  production: "https://app.digifamar.com/",
  preview: "https://id-preview--1f8a085c-2e11-418f-8dfb-b8d0ba60466c.lovable.app/",
};

function mask(key: string | null | undefined) {
  if (!key) return null;
  return key.length <= 8 ? "••••" : `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

async function checkBrowserKey(key: string | null, referrer: string): Promise<KeyCheck["status"] | { status: KeyCheck["status"]; detail: string }> {
  if (!key) return { status: "missing", detail: "No browser key configured for this environment." };
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/staticmap?center=0,0&zoom=1&size=1x1&key=${encodeURIComponent(key)}`,
      { headers: { Referer: referrer } },
    );
    if (res.ok) return { status: "valid", detail: `Accepted for ${referrer}` };
    const text = await res.text().catch(() => "");
    return { status: "invalid", detail: `HTTP ${res.status}${text ? ` — ${text.slice(0, 180)}` : ""}` };
  } catch (e) {
    return { status: "invalid", detail: e instanceof Error ? e.message : "Request failed" };
  }
}

async function checkServerKey(key: string | null) {
  if (!key) return { status: "missing" as const, detail: "No server geocoding key configured." };
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=Atlanta,GA&key=${encodeURIComponent(key)}`,
    );
    const data = (await res.json()) as { status?: string; error_message?: string };
    if (data.status === "OK") return { status: "valid" as const, detail: "Geocoding request succeeded." };
    return {
      status: "invalid" as const,
      detail: `${data.status ?? `HTTP ${res.status}`}${data.error_message ? ` — ${data.error_message}` : ""}`,
    };
  } catch (e) {
    return { status: "invalid" as const, detail: e instanceof Error ? e.message : "Request failed" };
  }
}

export const checkMapKeyHealthFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }): Promise<KeyHealth> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admins only");

    const names = [browserKeyName(data.env), LEGACY_BROWSER_KEY_NAME, serverKeyName(data.env)];
    const { data: rows } = await context.supabase
      .from("app_settings")
      .select("key, value")
      .in("key", names);

    const pick = (name: string) => rows?.find((r) => r.key === name)?.value?.trim() || null;

    const savedBrowser = pick(browserKeyName(data.env)) ?? pick(LEGACY_BROWSER_KEY_NAME);
    const savedServer = pick(serverKeyName(data.env));
    const fallback = process.env.GOOGLE_API_KEY ?? null;

    const browserKey = savedBrowser ?? fallback;
    const serverKey = savedServer ?? fallback;
    const referrer = data.referrer ?? DEFAULT_REFERRER[data.env] ?? "https://app.digifamar.com/";

    const browserResult = (await checkBrowserKey(browserKey, referrer)) as {
      status: KeyCheck["status"];
      detail: string;
    };
    const serverResult = await checkServerKey(serverKey);

    return {
      environment: data.env,
      referrer,
      browser: {
        source: savedBrowser ? "saved" : browserKey ? "fallback" : "none",
        masked: mask(browserKey),
        ...browserResult,
      },
      server: {
        source: savedServer ? "saved" : serverKey ? "fallback" : "none",
        masked: mask(serverKey),
        ...serverResult,
      },
    };
  });
