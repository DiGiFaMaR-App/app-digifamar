import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Loader2 } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { PlanCheckout } from "@/components/subscription/PlanCheckout";
import { isStripeConfigured } from "@/lib/payments/stripe-client";
import { usePlan } from "@/hooks/use-subscription";
import { useAuth } from "@/hooks/use-auth";
import { PLANS, PLAN_ORDER, planRank, type PlanId } from "@/lib/entitlements/plans";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Farmer pricing plans | DiGiFaMaR" },
      {
        name: "description",
        content:
          "Free, Pro, and Elite plans. A flat 10% platform fee on every sale, plus featured placement, analytics, and lending access.",
      },
      { property: "og:title", content: "Farmer pricing plans | DiGiFaMaR" },
      { property: "og:description", content: "Free, Pro, and Elite plans for American farmers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://app.digifamar.com/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://app.digifamar.com/pricing" }],
  }),
  component: Pricing,
});

function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { plan: currentPlan, loading } = usePlan();
  const [checkoutPlan, setCheckoutPlan] = useState<PlanId | null>(null);

  const choose = (planId: PlanId) => {
    if (!user) {
      void navigate({ to: "/signin", search: { redirect: "/pricing" } as never });
      return;
    }
    if (currentPlan !== "free") {
      void navigate({ to: "/settings/billing" });
      return;
    }
    setCheckoutPlan(planId);
  };

  const ctaLabel = (planId: PlanId) => {
    if (planId === "free") return currentPlan === "free" ? "Your current plan" : "Included";
    if (currentPlan === planId) return "Current plan";
    if (planRank(currentPlan) > planRank(planId)) return "Downgrade";
    return currentPlan === "free" ? `Choose ${PLANS[planId].name}` : `Upgrade to ${PLANS[planId].name}`;
  };

  return (
    <SiteLayout>
      <PaymentTestModeBanner />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-extrabold sm:text-5xl">Farmer pricing</h1>
          <p className="mt-3 text-muted-foreground">
            A flat 10% DiGiFaMaR platform fee on every sale, on every plan. Escrow and
            payment-processing charges are billed separately and shown at checkout. Cancel anytime.
          </p>
          {user && !loading ? (
            <p className="mt-3 text-sm font-semibold text-primary">
              You&apos;re on the {PLANS[currentPlan].name} plan.{" "}
              <Link to="/settings/billing" className="underline">
                Manage billing
              </Link>
            </p>
          ) : null}
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PLAN_ORDER.map((planId) => {
            const t = PLANS[planId];
            const isCurrent = currentPlan === planId;
            return (
              <div
                key={t.id}
                className={`card-lift relative flex flex-col rounded-2xl border bg-card p-6 ${
                  t.highlight ? "border-primary ring-2 ring-primary/30" : "border-border"
                }`}
              >
                {t.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-secondary px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-secondary-foreground">
                    Most popular
                  </span>
                )}
                <h2 className="text-xl font-bold">{t.name}</h2>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">{t.priceLabel}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-primary">10% platform fee</p>
                <ul className="mt-6 flex-1 space-y-2 text-sm">
                  {t.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                {planId === "free" ? (
                  <Button
                    asChild
                    className="mt-6 w-full border border-border bg-card text-foreground hover:bg-muted"
                  >
                    <Link to="/signup/farmer">Start free</Link>
                  </Button>
                ) : (
                  <Button
                    className={`mt-6 w-full ${
                      t.highlight ? "" : "border border-border bg-card text-foreground hover:bg-muted"
                    }`}
                    disabled={isCurrent || loading || !isStripeConfigured}
                    onClick={() => choose(planId)}
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {ctaLabel(planId)}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {!isStripeConfigured ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Card payments aren&apos;t configured in this environment yet.
          </p>
        ) : null}

        {checkoutPlan ? (
          <div className="mx-auto mt-10 max-w-2xl">
            <h2 className="mb-3 text-lg font-semibold">
              Subscribe to {PLANS[checkoutPlan].name} — {PLANS[checkoutPlan].priceLabel}/month
            </h2>
            <PlanCheckout
              priceId={PLANS[checkoutPlan].priceId as string}
              returnUrl={`${typeof window === "undefined" ? "" : window.location.origin}/settings/billing?checkout=success`}
            />
            <button
              type="button"
              className="mt-3 text-sm text-muted-foreground underline"
              onClick={() => setCheckoutPlan(null)}
            >
              Cancel
            </button>
          </div>
        ) : null}
      </div>
    </SiteLayout>
  );
}
