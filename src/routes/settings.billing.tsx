import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useAuth } from "@/hooks/use-auth";
import {
  getStripeEnvironment,
  isSubscriptionActive,
  usePlan,
  useSubscriptions,
} from "@/hooks/use-subscription";
import { createBillingPortalSession } from "@/lib/subscriptions/plans.functions";
import { PLANS, planFromPriceId } from "@/lib/entitlements/plans";
import { VIP_PRICE_ID } from "@/lib/subscriptions/vip.functions";

export const Route = createFileRoute("/settings/billing")({
  head: () => ({
    meta: [
      { title: "Billing & plan | DiGiFaMaR" },
      {
        name: "description",
        content:
          "See your DiGiFaMaR farmer plan, renewal date, add-ons, and manage your card, invoices, or cancellation.",
      },
      { property: "og:title", content: "Billing & plan | DiGiFaMaR" },
      {
        property: "og:description",
        content: "Manage your DiGiFaMaR farmer plan, payment method, and invoices.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BillingSettings,
});

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString() : null;
}

function BillingSettings() {
  const { user, loading: authLoading } = useAuth();
  const { plan, definition, renewsAt, cancelAtPeriodEnd, pastDue, loading } = usePlan();
  const { rows } = useSubscriptions();
  const [busy, setBusy] = useState(false);

  const vip = rows.find((r) => r.price_id === VIP_PRICE_ID && isSubscriptionActive(r)) ?? null;

  const openPortal = async () => {
    setBusy(true);
    try {
      const result = await createBillingPortalSession({
        data: {
          returnUrl: `${window.location.origin}/settings/billing`,
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

  if (!authLoading && !user) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Billing & plan</h1>
          <p className="mt-3 text-muted-foreground">Sign in to view your plan and invoices.</p>
          <Button asChild className="mt-6">
            <Link to="/signin">Sign in</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <PaymentTestModeBanner />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Billing &amp; plan</h1>
        <p className="mt-2 text-muted-foreground">
          Your subscription, renewal date, and payment details. The 10% DiGiFaMaR platform fee on
          sales is charged per order and is the same on every plan.
        </p>

        <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-soft">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading" />
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Current plan</p>
                  <p className="text-2xl font-bold">
                    {definition.name}{" "}
                    <span className="text-base font-medium text-muted-foreground">
                      {definition.priceLabel}/month
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {definition.listingLimit === null
                      ? "Unlimited active listings"
                      : `Up to ${definition.listingLimit} active listings`}
                  </p>
                  {pastDue ? (
                    <p className="mt-2 text-sm font-medium text-destructive">
                      Your last payment failed. Update your card to keep your plan — access
                      continues while Stripe retries.
                    </p>
                  ) : cancelAtPeriodEnd && renewsAt ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Cancelled — access continues until {renewsAt.toLocaleDateString()}.
                    </p>
                  ) : renewsAt ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Renews on {renewsAt.toLocaleDateString()}.
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2">
                  {plan === "free" ? (
                    <Button asChild>
                      <Link to="/pricing">Upgrade plan</Link>
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={openPortal} disabled={busy}>
                      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Manage billing
                      <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Button>
                  )}
                  <Button asChild variant="ghost">
                    <Link to="/pricing">Compare plans</Link>
                  </Button>
                </div>
              </div>

              <ul className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
                {definition.features.map((f) => (
                  <li key={f} className="text-muted-foreground">
                    • {f}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-lg font-semibold">Add-ons</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            VIP verification badge — {vip ? "active" : "not active"}
            {vip?.current_period_end
              ? ` · ${vip.cancel_at_period_end ? "ends" : "renews"} ${formatDate(vip.current_period_end)}`
              : ""}
            .
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/farmer/verification">Manage VIP badge</Link>
          </Button>
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <CreditCard className="h-5 w-5 text-primary" aria-hidden="true" />
            Payment method &amp; invoices
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your card, download invoices, switch plans, or cancel in the secure Stripe
            billing portal. It opens in a new tab.
          </p>
          <Button className="mt-4" variant="outline" onClick={openPortal} disabled={busy || plan === "free" ? !vip && plan === "free" : false}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Open billing portal
            <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
          {plan === "free" && !vip ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Available once you have a paid plan or add-on.
            </p>
          ) : null}
        </section>

        <p className="mt-8 text-xs text-muted-foreground">
          Plan subscriptions are separate from order payments. Order funds are held in escrow and
          released to the farmer only after the buyer confirms delivery with the 6-digit release
          code. Plans never change escrow behaviour.
        </p>
      </div>
    </SiteLayout>
  );
}
