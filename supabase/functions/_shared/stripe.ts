// Shared Stripe access for DiGiFaMaR Edge Functions.
//
// KEY SELECTION — the project does not hold raw Stripe secret keys. Lovable's
// payments integration provisions *connection* keys (`lovc_...`) that must be
// sent to the connector gateway, which attaches the real Stripe secret. We
// branch on an environment flag rather than hardcoding a single secret name:
//
//   STRIPE_ENV=live      -> STRIPE_LIVE_API_KEY    + PAYMENTS_LIVE_WEBHOOK_SECRET
//   STRIPE_ENV=sandbox   -> STRIPE_SANDBOX_API_KEY + PAYMENTS_SANDBOX_WEBHOOK_SECRET
//   (default: sandbox)
//
// A legacy raw `STRIPE_SECRET_KEY` (sk_...) is still honoured as a fallback and
// is then talked to directly at api.stripe.com.
//
// SAFETY GATE — money-transmitter compliance: live mode is REJECTED unless the
// operator sets MONEY_TRANSMITTER_CLEARED="true".

const STRIPE_DIRECT = "https://api.stripe.com/v1";
const STRIPE_GATEWAY = "https://connector-gateway.lovable.dev/stripe/v1";

export type StripeEnv = "sandbox" | "live";

export function stripeEnv(): StripeEnv {
  return Deno.env.get("STRIPE_ENV") === "live" ? "live" : "sandbox";
}

export class StripeConfigError extends Error {}
export class StripeApiError extends Error {
  constructor(message: string, readonly code?: string, readonly status?: number) {
    super(message);
  }
}

type Conn = { key: string; base: string; headers: Record<string, string> };

/** Resolve the credentials for the active environment. Throws StripeConfigError. */
export function stripeConn(env: StripeEnv = stripeEnv()): Conn {
  if (env === "live" && Deno.env.get("MONEY_TRANSMITTER_CLEARED") !== "true") {
    throw new StripeConfigError(
      "Live Stripe mode is not enabled (money-transmitter licensing not cleared).",
    );
  }
  const key =
    (env === "live" ? Deno.env.get("STRIPE_LIVE_API_KEY") : Deno.env.get("STRIPE_SANDBOX_API_KEY")) ??
    Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new StripeConfigError("Stripe is not configured for this environment.");

  if (key.startsWith("sk_")) {
    if (key.startsWith("sk_live_") && Deno.env.get("MONEY_TRANSMITTER_CLEARED") !== "true") {
      throw new StripeConfigError(
        "Live Stripe key detected but money-transmitter licensing is not cleared.",
      );
    }
    return { key, base: STRIPE_DIRECT, headers: { Authorization: `Bearer ${key}` } };
  }

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) throw new StripeConfigError("LOVABLE_API_KEY is not configured.");
  return {
    key,
    base: STRIPE_GATEWAY,
    headers: { "X-Connection-Api-Key": key, "Lovable-API-Key": lovableKey },
  };
}

export function webhookSecret(env: StripeEnv = stripeEnv()): string {
  const secret =
    env === "live"
      ? Deno.env.get("PAYMENTS_LIVE_WEBHOOK_SECRET")
      : Deno.env.get("PAYMENTS_SANDBOX_WEBHOOK_SECRET");
  if (!secret) throw new StripeConfigError("Stripe webhook secret is not configured.");
  return secret;
}

/** Flatten nested objects into Stripe's bracket form-encoding. */
export function stripeForm(
  input: Record<string, unknown>,
  prefix = "",
  out: Record<string, string> = {},
): Record<string, string> {
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object" && !Array.isArray(v)) {
      stripeForm(v as Record<string, unknown>, key, out);
    } else if (Array.isArray(v)) {
      v.forEach((item, i) => {
        out[`${key}[${i}]`] = String(item);
      });
    } else {
      out[key] = String(v);
    }
  }
  return out;
}

/**
 * Call the Stripe REST API. Every write MUST pass a deterministic
 * `idempotencyKey` so a retry can never double-charge or double-pay.
 */
export async function stripeRequest(
  path: string,
  opts: {
    method?: "GET" | "POST";
    body?: Record<string, unknown>;
    idempotencyKey?: string;
    env?: StripeEnv;
    // deno-lint-ignore no-explicit-any
  } = {},
): Promise<any> {
  const conn = stripeConn(opts.env ?? stripeEnv());
  const method = opts.method ?? (opts.body ? "POST" : "GET");
  if (method === "POST" && !opts.idempotencyKey) {
    throw new StripeConfigError(`Refusing Stripe write to ${path} without an idempotency key`);
  }
  const headers: Record<string, string> = {
    ...conn.headers,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

  const res = await fetch(`${conn.base}${path}`, {
    method,
    headers,
    body: opts.body ? new URLSearchParams(stripeForm(opts.body)).toString() : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new StripeApiError(
      json?.error?.message ?? `Stripe HTTP ${res.status}`,
      json?.error?.code,
      res.status,
    );
  }
  return json;
}

/**
 * Never leak raw Stripe/provider text to the client — log it, return a generic
 * message the UI can safely show.
 */
export function safeStripeError(e: unknown, context: string, generic: string): string {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`[stripe] ${context}:`, msg);
  if (e instanceof StripeConfigError) return msg; // configuration, not card data
  return generic;
}

/** Constant-time-ish comparison of two hex strings. */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verify a Stripe webhook signature (HMAC-SHA256 over `${timestamp}.${payload}`).
 * Throws when the signature is missing, malformed, stale, or wrong.
 */
export async function verifyStripeSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds = 300,
): Promise<void> {
  if (!signatureHeader) throw new Error("Missing stripe-signature header");
  let timestamp: string | undefined;
  const v1: string[] = [];
  for (const part of signatureHeader.split(",")) {
    const [k, v] = part.split("=", 2);
    if (k?.trim() === "t") timestamp = v;
    if (k?.trim() === "v1" && v) v1.push(v);
  }
  if (!timestamp || v1.length === 0) throw new Error("Invalid stripe-signature header");
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > toleranceSeconds) {
    throw new Error("Webhook timestamp outside tolerance");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (!v1.some((candidate) => timingSafeEqualHex(candidate, expected))) {
    throw new Error("Invalid webhook signature");
  }
}
