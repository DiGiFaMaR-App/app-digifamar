/**
 * SMS delivery — server-only.
 *
 * Thin wrapper over the Twilio REST API (no SDK dependency; uses `fetch`).
 * Credentials come from the environment:
 *   TWILIO_ACCOUNT_SID   – Twilio account SID (starts with "AC…")
 *   TWILIO_AUTH_TOKEN    – Twilio auth token
 *   TWILIO_FROM_NUMBER   – sending number in E.164 (e.g. "+14155550123")
 *
 * Design notes:
 * - This module NEVER throws for a delivery problem. Callers (e.g. the escrow
 *   OTP flow) must not have money/state transitions fail just because SMS is
 *   unconfigured or Twilio is down — they inspect the returned result instead.
 * - When Twilio is not configured the send is skipped and reported as such, so
 *   local/dev/test environments keep working without secrets.
 * - Numbers are normalized to E.164 before sending.
 */
import { normalizeToE164 } from "@/lib/phone";

const TWILIO_API_BASE = "https://api.twilio.com/2010-04-01";

export type SmsResult =
  | { sent: true; sid: string; to: string }
  | {
      sent: false;
      reason: "not_configured" | "invalid_number" | "provider_error";
      detail?: string;
    };

type TwilioConfig = {
  accountSid: string;
  authToken: string;
  fromNumber: string;
};

function readConfig(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !fromNumber) return null;
  return { accountSid, authToken, fromNumber };
}

/** True when Twilio credentials are present in the environment. */
export function isSmsConfigured(): boolean {
  return readConfig() !== null;
}

/**
 * Send an SMS. Returns a result describing what happened; does not throw on
 * delivery failure. `fetchImpl` is injectable for testing.
 */
export async function sendSms(
  to: string | null | undefined,
  body: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SmsResult> {
  const config = readConfig();
  if (!config) {
    console.warn("[sms] Twilio not configured (TWILIO_* env vars missing); skipping send.");
    return { sent: false, reason: "not_configured" };
  }

  const e164 = normalizeToE164(to);
  if (!e164) {
    console.warn("[sms] recipient number is missing or not valid E.164; skipping send.");
    return { sent: false, reason: "invalid_number" };
  }

  const params = new URLSearchParams({ To: e164, From: config.fromNumber, Body: body });
  const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64");

  try {
    const res = await fetchImpl(`${TWILIO_API_BASE}/Accounts/${config.accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[sms] Twilio returned ${res.status}: ${detail}`);
      return { sent: false, reason: "provider_error", detail: `HTTP ${res.status}` };
    }

    const payload = (await res.json().catch(() => ({}))) as { sid?: string };
    return { sent: true, sid: payload.sid ?? "unknown", to: e164 };
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
