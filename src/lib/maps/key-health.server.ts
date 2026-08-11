/**
 * Server-only helpers for Google Maps key health checks.
 */
export type KeyStatus = "valid" | "invalid" | "missing";
export type KeyCheck = {
  source: "saved" | "fallback" | "none";
  masked: string | null;
  status: KeyStatus;
  detail: string;
};

export type KeyHealth = {
  environment: string;
  referrer: string;
  browser: KeyCheck;
  server: KeyCheck;
};

export const DEFAULT_REFERRER: Record<string, string> = {
  production: "https://app.digifamar.com/",
  preview: "https://id-preview--1f8a085c-2e11-418f-8dfb-b8d0ba60466c.lovable.app/",
};

export function maskKey(key: string | null | undefined) {
  if (!key) return null;
  return key.length <= 8 ? "••••" : `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

export async function checkBrowserKey(
  key: string | null,
  referrer: string,
): Promise<{ status: KeyStatus; detail: string }> {
  if (!key) return { status: "missing", detail: "No browser key configured for this environment." };
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/staticmap?center=0,0&zoom=1&size=1x1&key=${encodeURIComponent(key)}`,
      { headers: { Referer: referrer } },
    );
    if (res.ok) return { status: "valid", detail: `Accepted for ${referrer}` };
    const text = await res.text().catch(() => "");
    return {
      status: "invalid",
      detail: `HTTP ${res.status}${text ? ` — ${text.slice(0, 180)}` : ""}`,
    };
  } catch (e) {
    return { status: "invalid", detail: e instanceof Error ? e.message : "Request failed" };
  }
}

export async function checkServerKey(
  key: string | null,
): Promise<{ status: KeyStatus; detail: string }> {
  if (!key) return { status: "missing", detail: "No server geocoding key configured." };
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=Atlanta,GA&key=${encodeURIComponent(key)}`,
    );
    const data = (await res.json()) as { status?: string; error_message?: string };
    if (data.status === "OK") return { status: "valid", detail: "Geocoding request succeeded." };
    return {
      status: "invalid",
      detail: `${data.status ?? `HTTP ${res.status}`}${data.error_message ? ` — ${data.error_message}` : ""}`,
    };
  } catch (e) {
    return { status: "invalid", detail: e instanceof Error ? e.message : "Request failed" };
  }
}
