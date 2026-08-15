/**
 * Farmer plan subscriptions (Pro $29/mo, Elite $79/mo).
 *
 * Thin server-function wrapper — all runtime helpers live in stripe.server.ts.
 * Plan changes (upgrade / downgrade / cancel / card update) are handled by the
 * Stripe billing portal so proration and dunning stay Stripe-managed.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getStripeErrorMessage, stripeRequest, type StripeEnv } from "@/lib/stripe.server";

const ALLOWED_PRICE_IDS = ["pro_monthly", "elite_monthly"] as const;

type CheckoutResult = { clientSecret: string } | { error: string };
type PortalResult = { url: string } | { error: string };

function env(value: unknown): StripeEnv {
  return value === "live" ? "live" : "sandbox";
}

async function resolveCustomer(
  e: StripeEnv,
  userId: string,
  email: string | undefined,
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(userId)) throw new Error("Invalid user id");

  const found = await stripeRequest<{ data: Array<{ id: string }> }>(
    `/customers/search?query=${encodeURIComponent(`metadata['userId']:'${userId}'`)}&limit=1`,
    { env: e, method: "GET" },
  );
  if (found.data?.length) return found.data[0]!.id;

  if (email) {
    const byEmail = await stripeRequest<{
      data: Array<{ id: string; metadata?: Record<string, string> }>;
    }>(`/customers?email=${encodeURIComponent(email)}&limit=1`, { env: e, method: "GET" });
    const existing = byEmail.data?.[0];
    if (existing) {
      if (existing.metadata?.["userId"] !== userId) {
        await stripeRequest(`/customers/${existing.id}`, {
          env: e,
          body: { metadata: { userId } },
          idempotencyKey: `plan-cust-meta-${userId}`,
        });
      }
      return existing.id;
    }
  }

  const created = await stripeRequest<{ id: string }>("/customers", {
    env: e,
    body: { ...(email ? { email } : {}), metadata: { userId } },
    idempotencyKey: `plan-cust-${userId}`,
  });
  return created.id;
}

export const createPlanCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { priceId: string; returnUrl: string; environment: StripeEnv }) => {
    if (!(ALLOWED_PRICE_IDS as readonly string[]).includes(data.priceId)) {
      throw new Error("Unknown plan");
    }
    return data;
  })
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { userId, supabase } = context;
    const e = env(data.environment);
    try {
      // A farmer holds at most one plan at a time — existing subscribers change
      // plans through the billing portal so Stripe prorates correctly.
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("status, current_period_end, price_id")
        .eq("user_id", userId)
        .eq("environment", e)
        .in("price_id", [...ALLOWED_PRICE_IDS])
        .order("created_at", { ascending: false })
        .limit(5);
      const live = (existing ?? []).find(
        (row) =>
          ["active", "trialing", "past_due"].includes(row.status) &&
          (!row.current_period_end || new Date(row.current_period_end) > new Date()),
      );
      if (live) {
        return {
          error: "You already have an active plan. Use Manage billing to switch plans.",
        };
      }

      const prices = await stripeRequest<{ data: Array<{ id: string }> }>(
        `/prices?lookup_keys[0]=${data.priceId}&limit=1`,
        { env: e, method: "GET" },
      );
      const price = prices.data?.[0];
      if (!price) return { error: "That plan is not available yet." };

      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .maybeSingle();

      const customer = await resolveCustomer(e, userId, profile?.email ?? undefined);

      const session = await stripeRequest<{ client_secret?: string }>("/checkout/sessions", {
        env: e,
        idempotencyKey: `plan-checkout-${userId}-${data.priceId}-${Date.now()}`,
        body: {
          mode: "subscription",
          ui_mode: "embedded_page",
          return_url: data.returnUrl,
          customer,
          line_items: [{ price: price.id, quantity: 1 }],
          metadata: { userId, plan: data.priceId },
          subscription_data: { metadata: { userId, plan: data.priceId } },
        },
      });
      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/**
 * Billing portal for any DiGiFaMaR subscription (plan or VIP add-on):
 * change plan, update card, view invoices, cancel.
 */
export const createBillingPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl?: string; environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<PortalResult> => {
    const { userId, supabase } = context;
    const e = env(data.environment);
    try {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .eq("environment", e)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!sub?.stripe_customer_id) return { error: "No subscription found." };

      const portal = await stripeRequest<{ url: string }>("/billing_portal/sessions", {
        env: e,
        idempotencyKey: `portal-${userId}-${Date.now()}`,
        body: {
          customer: sub.stripe_customer_id,
          ...(data.returnUrl ? { return_url: data.returnUrl } : {}),
        },
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
