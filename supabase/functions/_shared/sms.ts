// Shared SMS helper for DiGiFaMaR Edge Functions.
//
// Single Vonage integration reused by every function that needs to text a user
// (delivery OTP in `escrow`, signup phone verification in `verify-phone`).
// Credentials come from the Supabase secret store; when they are unset the
// helper is a no-op so functions still run in dev/degraded mode.

/** Best-effort SMS via Vonage. Returns whether it was actually sent. */
export async function sendSms(to: string | null | undefined, body: string): Promise<boolean> {
  const apiKey = Deno.env.get("VONAGE_API_KEY");
  const apiSecret = Deno.env.get("VONAGE_API_SECRET");
  const from = Deno.env.get("VONAGE_FROM");
  if (!apiKey || !apiSecret || !from || !to) return false;
  const e164 = to.replace(/[^\d+]/g, "");
  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      api_secret: apiSecret,
      from,
      to: e164.replace(/^\+/, ""),
      text: body,
    });
    const res = await fetch("https://rest.nexmo.com/sms/json", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: params.toString(),
    });
    if (!res.ok) return false;
    const payload = await res.json().catch(() => ({}));
    return payload?.messages?.[0]?.status === "0";
  } catch (e) {
    console.error("[sms] send failed", e);
    return false;
  }
}
