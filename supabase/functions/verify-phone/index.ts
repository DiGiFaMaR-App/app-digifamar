// Signup phone-verification Edge Function.
//
// Runs BEFORE the auth account exists, so it is unauthenticated and keys the
// challenge by phone number. Reuses the shared Vonage sendSms(). Codes are
// stored hashed in public.phone_otps (service-role only). On a successful
// check we stamp verified_at; handle_new_user() then promotes the matching
// profiles.phone_verified when the user signs up within 30 minutes.
//
// Actions:
//   { action: "send",  phone }          -> texts a 6-digit code (rate-limited)
//   { action: "check", phone, code }    -> validates the code
//
// Abuse controls: 60s resend cooldown, code TTL, max 5 wrong attempts.
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";
// getUser is intentionally not imported: this endpoint runs pre-signup.
import { sendSms } from "../_shared/sms.ts";

const CODE_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

const sb = adminClient();

function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[^\d+]/g, "");
  const digits = cleaned.replace(/^\+/, "");
  if (digits.length < 10 || digits.length > 15) return null;
  return cleaned.startsWith("+") ? cleaned : `+${digits}`;
}

function generateCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, "0");
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const phone = normalizePhone(body.phone);
    if (!phone) return errorResponse("A valid phone number is required.", 400);

    if (action === "send") {
      const { data: existing } = await sb
        .from("phone_otps")
        .select("last_sent_at")
        .eq("phone", phone)
        .maybeSingle();
      if (existing?.last_sent_at) {
        const since = (Date.now() - new Date(existing.last_sent_at).getTime()) / 1000;
        if (since < RESEND_COOLDOWN_SECONDS) {
          return errorResponse(
            `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - since)}s before requesting another code.`,
            429,
          );
        }
      }

      const code = generateCode();
      const codeHash = await sha256Hex(`${phone}:${code}`);
      const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString();
      const { error } = await sb.from("phone_otps").upsert({
        phone,
        code_hash: codeHash,
        expires_at: expiresAt,
        attempts: 0,
        verified_at: null,
        last_sent_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);

      const sent = await sendSms(
        phone,
        `DiGiFaMaR: your verification code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes.`,
      );
      // When SMS isn't configured (dev), surface the code so the flow is testable.
      const devCode = sent ? undefined : code;
      return jsonResponse({ ok: true, sent, ...(devCode ? { devCode } : {}) });
    }

    if (action === "check") {
      const code = typeof body.code === "string" ? body.code.trim() : "";
      if (!/^\d{6}$/.test(code)) return errorResponse("Enter the 6-digit code.", 400);

      const { data: row } = await sb
        .from("phone_otps")
        .select("code_hash, expires_at, attempts")
        .eq("phone", phone)
        .maybeSingle();
      if (!row) return errorResponse("Request a code first.", 400);
      if (new Date(row.expires_at).getTime() < Date.now())
        return errorResponse("That code has expired. Request a new one.", 400);
      if (row.attempts >= MAX_ATTEMPTS)
        return errorResponse("Too many attempts. Request a new code.", 429);

      const candidate = await sha256Hex(`${phone}:${code}`);
      if (candidate !== row.code_hash) {
        await sb
          .from("phone_otps")
          .update({ attempts: row.attempts + 1 })
          .eq("phone", phone);
        return errorResponse("Incorrect code. Please try again.", 400);
      }

      await sb
        .from("phone_otps")
        .update({ verified_at: new Date().toISOString() })
        .eq("phone", phone);
      return jsonResponse({ ok: true, verified: true });
    }

    return errorResponse("Unknown action.", 400);
  } catch (e) {
    return errorResponse((e as Error)?.message ?? "verify-phone error", 400);
  }
});
