import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { STRIPE_PUBLISHABLE_KEY } from "@/lib/payments/stripe-client";
import { PLANS, planFromPriceId, planRank, type PlanId } from "@/lib/entitlements/plans";

export type StripeEnv = "sandbox" | "live";

export function getStripeEnvironment(): StripeEnv {
  return STRIPE_PUBLISHABLE_KEY.startsWith("pk_live_") ? "live" : "sandbox";
}

export type SubscriptionRow = {
  status: string;
  price_id: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

const ACTIVE_STATUSES = ["active", "trialing", "past_due"];

export function isSubscriptionActive(sub: SubscriptionRow | null): boolean {
  if (!sub) return false;
  const notExpired = !sub.current_period_end || new Date(sub.current_period_end) > new Date();
  if (ACTIVE_STATUSES.includes(sub.status)) return notExpired;
  // Cancelled subscriptions keep access until the paid period ends.
  return sub.status === "canceled" && notExpired;
}

/**
 * All subscription rows for the signed-in user in the current Stripe
 * environment, newest first. A farmer can hold more than one at a time (e.g. a
 * plan plus the VIP badge add-on), so every consumer filters this list itself.
 */
export function useSubscriptions() {
  const { user } = useAuth();
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("subscriptions")
      .select("status, price_id, current_period_end, cancel_at_period_end, created_at")
      .eq("user_id", user.id)
      .eq("environment", getStripeEnvironment())
      .order("created_at", { ascending: false })
      .limit(20);
    setRows(((data ?? []) as SubscriptionRow[]) ?? []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`subscriptions-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, refresh]);

  return { rows, loading, refresh };
}

/**
 * Newest subscription row, optionally narrowed to one Stripe price
 * (e.g. the VIP badge add-on).
 */
export function useSubscription(priceId?: string) {
  const { rows, loading, refresh } = useSubscriptions();
  const subscription = useMemo(
    () => rows.find((r) => (priceId ? r.price_id === priceId : true)) ?? null,
    [rows, priceId],
  );
  return {
    subscription,
    loading,
    isActive: isSubscriptionActive(subscription),
    refresh,
  };
}

export type PlanState = {
  plan: PlanId;
  definition: (typeof PLANS)[PlanId];
  subscription: SubscriptionRow | null;
  /** Renewal / access-end date for the paid plan, if any. */
  renewsAt: Date | null;
  cancelAtPeriodEnd: boolean;
  pastDue: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

/**
 * The signed-in farmer's effective plan. `past_due` keeps entitlements while
 * Stripe retries the card; `canceled` keeps them until the paid period ends.
 */
export function usePlan(): PlanState {
  const { rows, loading, refresh } = useSubscriptions();

  return useMemo(() => {
    const planRows = rows
      .filter((r) => planFromPriceId(r.price_id) !== "free" && isSubscriptionActive(r))
      .sort((a, b) => planRank(planFromPriceId(b.price_id)) - planRank(planFromPriceId(a.price_id)));
    const best = planRows[0] ?? null;
    const plan = planFromPriceId(best?.price_id);
    return {
      plan,
      definition: PLANS[plan],
      subscription: best,
      renewsAt: best?.current_period_end ? new Date(best.current_period_end) : null,
      cancelAtPeriodEnd: Boolean(best?.cancel_at_period_end),
      pastDue: best?.status === "past_due",
      loading,
      refresh,
    };
  }, [rows, loading, refresh]);
}
