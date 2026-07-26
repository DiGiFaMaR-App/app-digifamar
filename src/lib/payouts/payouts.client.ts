/**
 * Farmer payouts — CLIENT module. Calls the `create-payout` Edge Function
 * (Stripe Connect). No secrets on the client; the function holds STRIPE_SECRET_KEY.
 */
import { supabase } from "@/integrations/supabase/client";

async function invokePayout<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("create-payout", { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      const j = await ctx.json().catch(() => null);
      if (j?.error) throw new Error(j.error);
    }
    throw new Error(error.message);
  }
  if (data && typeof data === "object" && "error" in data) {
    throw new Error((data as { error: string }).error);
  }
  return data as T;
}

export type PayoutStatus =
  | { notConfigured: true }
  | { connected: boolean; payoutsEnabled: boolean; detailsSubmitted?: boolean };

export const getPayoutStatus = () => invokePayout<PayoutStatus>({ action: "status" });

export const startPayoutOnboarding = (returnUrl?: string) =>
  invokePayout<{ url: string; accountId: string } | { notConfigured: true }>({
    action: "onboard",
    returnUrl,
  });

export const requestPayout = () =>
  invokePayout<{ ok: true; transferId: string; amountCents: number } | { notConfigured: true }>({
    action: "payout",
  });
