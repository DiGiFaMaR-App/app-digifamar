import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Lock, Loader2, LogIn, ShieldCheck, ShoppingCart } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import {
  dollarsToCents,
  ESCROW_FEE_RATE,
  formatCents,
  formatRate,
  PLATFORM_FEE_RATE,
} from "@/lib/cart/fees";
import { createEscrowCheckoutFn } from "@/lib/checkout/checkout.functions";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [{ title: "Checkout — DiGiFaMaR" }, { name: "robots", content: "noindex" }],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { items, isEmpty, count, fees, clear } = useCart();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [shippingAddress, setShippingAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState(false);

  const addressValid = shippingAddress.trim().length >= 5;

  const handlePay = async () => {
    if (!addressValid) {
      toast.error("Enter a delivery address (at least 5 characters).");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createEscrowCheckoutFn({
        data: {
          items: items.map((i) => ({
            productId: i.productId,
            name: i.name,
            unitPriceCents: dollarsToCents(i.unitPrice),
            quantity: i.quantity,
          })),
          shippingAddress: shippingAddress.trim(),
        },
      });

      setPlaced(true);
      clear();
      if (result.escrow.simulated) {
        toast.info("Escrow.com is in demo mode — transaction simulated.");
      }
      navigate({
        to: "/payment-success",
        search: { orderId: result.orderId, amount: result.breakdown.totalCents / 100 },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Checkout failed. Please try again.";
      toast.error(/unauthorized/i.test(message) ? "Please sign in to complete checkout." : message);
      setSubmitting(false);
    }
  };

  // Empty cart (and we didn't just clear it after a successful order).
  if (isEmpty && !placed) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md px-4 pt-16 text-center">
          <ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="mt-3 text-xl font-extrabold">Your cart is empty</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add something fresh before checking out.
          </p>
          <Button
            asChild
            className="mt-5 bg-primary text-primary-foreground hover:bg-primary-hover"
          >
            <Link to="/market">Browse the marketplace</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold sm:text-3xl">
          <Lock className="h-6 w-6 text-primary" /> Checkout
        </h1>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* Left: address + sign-in gate */}
          <div className="space-y-5">
            {!authLoading && !isAuthenticated && (
              <div className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <LogIn className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="text-sm">
                  <p className="font-semibold">Sign in to pay</p>
                  <p className="mt-0.5 text-muted-foreground">
                    Checkout is escrow-protected, so you'll need an account.{" "}
                    <Link
                      to="/auth"
                      search={{ tab: "signin" }}
                      className="font-semibold text-primary hover:underline"
                    >
                      Sign in or create one
                    </Link>
                    .
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-5">
              <label htmlFor="shipping" className="text-sm font-semibold">
                Delivery address
              </label>
              <textarea
                id="shipping"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                rows={3}
                placeholder="Street, city, state, ZIP"
                className="mt-2 w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Items recap */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Order · {count} item{count === 1 ? "" : "s"}
              </h2>
              <ul className="mt-3 space-y-2">
                {items.map((i) => (
                  <li key={i.productId} className="flex items-center justify-between text-sm">
                    <span className="truncate text-muted-foreground">
                      {i.name} <span className="text-xs">×{i.quantity}</span>
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatCents(dollarsToCents(i.unitPrice) * i.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right: fee breakdown + pay */}
          <aside className="h-fit rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-20">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Payment
            </h2>

            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Subtotal" value={formatCents(fees.subtotalCents)} />
              <Row
                label={`Platform fee (${formatRate(PLATFORM_FEE_RATE)})`}
                value={formatCents(fees.platformFeeCents)}
                muted
              />
              <Row
                label={`Escrow fee (${formatRate(ESCROW_FEE_RATE)})`}
                value={formatCents(fees.escrowFeeCents)}
                muted
              />
              <div className="my-2 h-px bg-border" />
              <Row label="Total due" value={formatCents(fees.totalCents)} bold />
            </dl>

            <Button
              onClick={handlePay}
              disabled={submitting || isEmpty || (!authLoading && !isAuthenticated)}
              className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary-hover"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Opening escrow…
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-1 h-4 w-4" /> Pay with Escrow.com
                </>
              )}
            </Button>

            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Your {formatCents(fees.totalCents)} is held by{" "}
              <span className="font-semibold text-foreground">Escrow.com</span> and released to the
              farmer only after you confirm delivery. Full refund within 72 hours if anything's off.
            </p>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function Row({
  label,
  value,
  muted = false,
  bold = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={muted ? "text-muted-foreground" : bold ? "font-bold" : ""}>{label}</dt>
      <dd
        className={`tabular-nums ${bold ? "text-base font-extrabold text-primary" : "font-semibold"}`}
      >
        {value}
      </dd>
    </div>
  );
}
