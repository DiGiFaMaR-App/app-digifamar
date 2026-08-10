import { useCallback, useMemo, useState } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { BadgeCheck, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getStripe, isStripeConfigured } from "@/lib/payments/stripe-client";
import { createVipCheckoutSession, createVipPortalSession } from "@/lib/subscriptions/vip.functions";
import { getStripeEnvironment, useSubscription } from "@/hooks/use-subscription";
import { VipBadge } from "./VipBadge";

/**
 * VIP verification badge ($20/month) purchase + management surface.
 * Cancelled subscriptions keep the badge until the paid period ends.
 */
export function VipBadgeCard() {
  const { subscription, isActive, loading } = useSubscription();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const result = await createVipCheckoutSession({
      data: {
        returnUrl: `${window.location.origin}/farmer/verification?vip=success`,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Stripe did not return a checkout session.");
    return result.clientSecret;
  }, []);

  const checkoutOptions = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);

  const manage = async () => {
    setBusy(true);
    try {
      const result = await createVipPortalSession({
        data: {
          returnUrl: `${window.location.origin}/farmer/verification`,
          environment: getStripeEnvironment(),
        },
      });
      if ("error" in result) throw new Error(result.error);
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open billing.");
    } finally {
      setBusy(false);
    }
  };

  const endsOn = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString()
    : null;

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold tracking-tight">VIP verification badge</h2>
            {isActive ? <VipBadge /> : null}
          </div>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            A premium trust mark shown on your farm profile and listings, so buyers can see at a
            glance that your farm is VIP verified. $20 per month, cancel any time.
          </p>
          {isActive && subscription?.cancel_at_period_end && endsOn ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Cancelled — your badge stays active until {endsOn}.
            </p>
          ) : null}
          {isActive && !subscription?.cancel_at_period_end && endsOn ? (
            <p className="mt-2 text-sm text-muted-foreground">Renews on {endsOn}.</p>
          ) : null}
          {subscription?.status === "past_due" ? (
            <p className="mt-2 text-sm text-destructive">
              Your last payment failed — update your card to keep the badge.
            </p>
          ) : null}
        </div>

        <div className="flex gap-2">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading" />
          ) : isActive ? (
            <Button variant="outline" onClick={manage} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Manage billing
              <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button onClick={() => setOpen(true)} disabled={!isStripeConfigured}>
              Get VIP badge — $20/mo
            </Button>
          )}
        </div>
      </div>

      {!isStripeConfigured && !isActive ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Payments aren&apos;t configured in this environment yet.
        </p>
      ) : null}

      {open && !isActive ? (
        <div className="mt-6 rounded-xl border border-border bg-background p-2">
          <EmbeddedCheckoutProvider stripe={getStripe()} options={checkoutOptions}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      ) : null}
    </section>
  );
}
