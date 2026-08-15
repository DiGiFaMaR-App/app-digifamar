import { useCallback, useMemo } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/payments/stripe-client";
import { getStripeEnvironment } from "@/hooks/use-subscription";
import { createPlanCheckoutSession } from "@/lib/subscriptions/plans.functions";

/**
 * Embedded Stripe Checkout for a farmer plan. Mounted inline (never a redirect)
 * so the buyer/farmer never leaves DiGiFaMaR.
 */
export function PlanCheckout({ priceId, returnUrl }: { priceId: string; returnUrl: string }) {
  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const result = await createPlanCheckoutSession({
      data: { priceId, returnUrl, environment: getStripeEnvironment() },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Stripe did not return a checkout session.");
    return result.clientSecret;
  }, [priceId, returnUrl]);

  const options = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);

  return (
    <div className="rounded-xl border border-border bg-background p-2">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
