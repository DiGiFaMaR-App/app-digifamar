/**
 * SMS delivery — server-only.
 *
 * Thin wrapper over the Vonage (Nexmo) SMS API (no SDK dependency; uses
 * `fetch`). Credentials come from the environment:
 *   VONAGE_API_KEY      – Vonage API key
 *   VONAGE_API_SECRET   – Vonage API secret
 *   VONAGE_FROM         – sender ID or virtual number (e.g. "14155550123";
 *                         US destinations require a number, not alphanumeric)
 *
 * Design notes:
 * - This module NEVER throws for a delivery problem. Callers (e.g. the escrow
 *   OTP flow) must not have money/state transitions fail just because SMS is
 *   unconfigured or the provider is down — they inspect the returned result.
 * - When Vonage is not configured the send is skipped and reported as such, so
 *   local/dev/test environments keep working without secrets.
 * - Numbers are normalized to E.164 before sending.
 */
import { normalizeToE164 } from "@/lib/phone";

const VONAGE_SMS_ENDPOINT = "https://rest.nexmo.com/sms/json";

export type SmsResult =
  | { sent: true; sid: string; to: string }
  | {
      sent: false;
      reason: "not_configured" | "invalid_number" | "provider_error";
      detail?: string;
    };

type VonageConfig = {
  apiKey: string;
  apiSecret: string;
  from: string;
};

function readConfig(): VonageConfig | null {
  const apiKey = process.env.VONAGE_API_KEY;
  const apiSecret = process.env.VONAGE_API_SECRET;
  const from = process.env.VONAGE_FROM;
  if (!apiKey || !apiSecret || !from) return null;
  return { apiKey, apiSecret, from };
}

/** True when Vonage credentials are present in the environment. */
export function isSmsConfigured(): boolean {
  return readConfig() !== null;
}

type VonageResponse = {
  messages?: Array<{
    status?: string;
    "message-id"?: string;
    "error-text"?: string;
  }>;
};

/**
 * Send an SMS via Vonage. Returns a result describing what happened; does not
 * throw on delivery failure. `fetchImpl` is injectable for testing.
 */
export async function sendSms(
  to: string | null | undefined,
  body: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SmsResult> {
  const config = readConfig();
  if (!config) {
    console.warn("[sms] Vonage not configured (VONAGE_* env vars missing); skipping send.");
    return { sent: false, reason: "not_configured" };
  }

  const e164 = normalizeToE164(to);
  if (!e164) {
    console.warn("[sms] recipient number is missing or not valid E.164; skipping send.");
    return { sent: false, reason: "invalid_number" };
  }

  // Vonage expects the destination in international format without the "+".
  const params = new URLSearchParams({
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    from: config.from,
    to: e164.slice(1),
    text: body,
  });

  try {
    const res = await fetchImpl(VONAGE_SMS_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[sms] Vonage HTTP ${res.status}: ${detail}`);
      return { sent: false, reason: "provider_error", detail: `HTTP ${res.status}` };
    }

    // Vonage returns HTTP 200 even for logical failures; check message status.
    const payload = (await res.json().catch(() => ({}))) as VonageResponse;
    const message = payload.messages?.[0];
    if (!message || message.status !== "0") {
      const detail = message?.["error-text"] ?? "unknown Vonage error";
      console.error(`[sms] Vonage delivery failed (status ${message?.status}): ${detail}`);
      return { sent: false, reason: "provider_error", detail };
    }

    return { sent: true, sid: message["message-id"] ?? "unknown", to: e164 };
  } catch (err) {
    console.error("[sms] send failed:", err);
    return { sent: false, reason: "provider_error", detail: (err as Error)?.message };
  }
}

/** Mask an E.164 number for display/logging, e.g. "+16673619136" → "•••• 9136". */
export function maskPhone(e164: string | null | undefined): string {
  const normalized = normalizeToE164(e164);
  if (!normalized) return "the buyer's phone";
  return `•••• ${normalized.slice(-4)}`;
}
