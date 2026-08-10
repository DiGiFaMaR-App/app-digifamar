/**
 * Server-side Stripe access for TanStack server functions.
 *
 * The project holds Lovable *connection* keys (not raw `sk_...` secrets), so
 * every call is proxied through the Lovable connector gateway, which attaches
 * the real Stripe secret. A legacy raw `STRIPE_SECRET_KEY` is honoured as a
 * fallback and talks to api.stripe.com directly.
 *
 * Mirrors supabase/functions/_shared/stripe.ts so both runtimes behave the same.
 */
export type StripeEnv = "sandbox" | "live";

const STRIPE_DIRECT = "https://api.stripe.com/v1";
const STRIPE_GATEWAY = "https://connector-gateway.lovable.dev/stripe/v1";

function form(
  input: Record<string, unknown>,
  prefix = "",
  out: Record<string, string> = {},
): Record<string, string> {
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item && typeof item === "object") {
          form(item as Record<string, unknown>, `${key}[${i}]`, out);
        } else {
          out[`${key}[${i}]`] = String(item);
        }
      });
    } else if (typeof v === "object") {
      form(v as Record<string, unknown>, key, out);
    } else {
      out[key] = String(v);
    }
  }
  return out;
}

function conn(env: StripeEnv): { base: string; headers: Record<string, string> } {
  const key =
    (env === "live" ? process.env["STRIPE_LIVE_API_KEY"] : process.env["STRIPE_SANDBOX_API_KEY"]) ??
    process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error(`Stripe is not configured for the ${env} environment.`);

  if (key.startsWith("sk_")) {
    return { base: STRIPE_DIRECT, headers: { Authorization: `Bearer ${key}` } };
  }
  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured.");
  return {
    base: STRIPE_GATEWAY,
    headers: { "X-Connection-Api-Key": key, "Lovable-API-Key": lovableKey },
  };
}

export async function stripeRequest<T = Record<string, unknown>>(
  path: string,
  opts: {
    env: StripeEnv;
    method?: "GET" | "POST";
    body?: Record<string, unknown>;
    idempotencyKey?: string;
  },
): Promise<T> {
  const { base, headers } = conn(opts.env);
  const method = opts.method ?? (opts.body ? "POST" : "GET");
  const h: Record<string, string> = {
    ...headers,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (opts.idempotencyKey) h["Idempotency-Key"] = opts.idempotencyKey;

  const res = await fetch(`${base}${path}`, {
    method,
    headers: h,
    body: opts.body ? new URLSearchParams(form(opts.body)).toString() : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; code?: string };
  };
  if (!res.ok) {
    throw new Error(json?.error?.message ?? `Stripe HTTP ${res.status}`);
  }
  return json as T;
}

export function getStripeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Stripe request failed";
}
