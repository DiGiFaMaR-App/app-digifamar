// Farmer onboarding Edge Function.
//
// Runs immediately after `supabase.auth.signUp()` on /signup/farmer. Email
// confirmation is ON, so the client has NO session at that moment and cannot
// satisfy the `auth.uid() = user_id` RLS policy on farmer_profiles. Rather
// than weakening auth (disabling email confirmation) or silently dropping the
// farm data, this function writes the profile with the service role after
// independently proving the caller owns the flow:
//
//   1. The userId must resolve to a real auth user created in the last 30 min.
//   2. That user's metadata role must be "farmer".
//   3. The phone on the user's metadata must match a phone_otps row whose
//      verified_at is set and recent (same window) — i.e. the OTP actually
//      passed in this session.
//   4. No farmer_profiles row may exist for that user yet (single-shot).
//
// Anything else is rejected. No session, no bearer token, no trust in the
// request body beyond the userId that must satisfy all of the above.
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";

const WINDOW_MS = 30 * 60 * 1000;

const sb = adminClient();

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[^\d+]/g, "");
  const digits = cleaned.replace(/^\+/, "");
  if (digits.length < 10 || digits.length > 15) return null;
  return cleaned.startsWith("+") ? cleaned : `+${digits}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  try {
    const body = await req.json().catch(() => ({}));
    const userId = str(body.userId, 64);
    const farmName = str(body.farmName, 120);
    if (!userId || !farmName) return errorResponse("userId and farmName are required.", 400);

    // (1) real, freshly created auth user
    const { data: userRes, error: userErr } = await sb.auth.admin.getUserById(userId);
    if (userErr || !userRes?.user) return errorResponse("Unknown account.", 403);
    const user = userRes.user;
    const createdAt = new Date(user.created_at).getTime();
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > WINDOW_MS) {
      return errorResponse("Onboarding window has expired. Please contact support.", 403);
    }

    // (2) the account was created through the farmer signup flow
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    if (meta.role !== "farmer") return errorResponse("Account is not a farmer account.", 403);

    // (3) that account's phone passed OTP verification in this window
    const phone = normalizePhone(meta.phone);
    if (!phone) return errorResponse("No verified phone on this account.", 403);
    const { data: otp } = await sb
      .from("phone_otps")
      .select("verified_at")
      .eq("phone", phone)
      .maybeSingle();
    const verifiedAt = otp?.verified_at ? new Date(otp.verified_at).getTime() : NaN;
    if (!Number.isFinite(verifiedAt) || Date.now() - verifiedAt > WINDOW_MS) {
      return errorResponse("Phone verification missing or expired. Please verify again.", 403);
    }

    // (4) single-shot
    const { data: existing } = await sb
      .from("farmer_profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) return jsonResponse({ ok: true, alreadyExists: true });

    const { error: insertErr } = await sb.from("farmer_profiles").insert({
      user_id: userId,
      farm_name: farmName,
      city: str(body.city, 100),
      state: str(body.state, 2),
      zip: str(body.zip, 10),
      lat: num(body.lat),
      lng: num(body.lng),
      acres: num(body.acres),
      years_farming: num(body.yearsFarming),
      farm_type: str(body.farmType, 80),
      verification_status: "pending",
    });
    if (insertErr) {
      console.error("[farmer-onboard] insert failed", insertErr);
      return errorResponse("Could not save your farm details. Please contact support.", 500);
    }

    // Street address + USDA number are PII: they live in a private table that
    // only the farm owner and admins can read.
    const { error: privateErr } = await sb.from("farmer_profiles_private").upsert({
      user_id: userId,
      address: str(body.address, 200),
      usda_number: str(body.usdaNumber, 60),
    });
    if (privateErr) {
      console.error("[farmer-onboard] private details insert failed", privateErr);
      return errorResponse("Could not save your farm details. Please contact support.", 500);
    }

    return jsonResponse({ ok: true });
  } catch (e) {
    console.error("[farmer-onboard] error", e);
    return errorResponse((e as Error)?.message ?? "farmer-onboard error", 400);
  }
});
