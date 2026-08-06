/**
 * Escrow funding — real card collection with Stripe Elements.
 *
 * Card data never touches our servers: the PaymentElement is hosted by
 * Stripe, `stripe.createPaymentMethod()` tokenises it in the browser, and only
 * the resulting `paymentMethodId` is sent to the `escrow` Edge Function, which
 * creates and confirms the PaymentIntent server-side.
 *
 * Elements runs in *deferred* mode (`mode: "payment"` + amount) because there
 * is no client secret up front — the PaymentIntent is created inside the
 * function's `fund` action.
 *
 * One `orders` row exists per cart line, so each order is funded with its own
 * PaymentIntent, in sequence, from the same collected card.
 */
import { useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatCents } from "@/lib/cart/fees";
import { getStripe, isStripeConfigured } from "@/lib/payments/stripe-client";

export type PayableOrder = { id: string; totalCents: number };

type FundResponse = {
  orderId: string;
  status: "escrow_funded" | "requires_action";
  clientSecret?: string;
  paymentIntentId?: string;
};

/** Invoke the escrow Edge Function, surfacing its error body as a real message. */
async function invokeFund(orderId: string, paymentMethodId: string): Promise<FundResponse> {
  const { data, error } = await supabase.functions.invoke("escrow", {
    body: { action: "fund", orderId, paymentMethodId },
  });
  if (error) {
    let message = error.message;
    // Edge Function errors carry the JSON body on `context`.
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      const body = await ctx.json().catch(() => null);
      if (body && typeof body.error === "string") message = body.error;
    }
    throw new Error(message);
  }
  return data as FundResponse;
}

export function EscrowPaymentForm({
  orders,
  totalCents,
  onFunded,
  onCancel,
}: {
  orders: PayableOrder[];
  totalCents: number;
  onFunded: () => void;
  onCancel?: () => void;
}) {
  if (!isStripeConfigured) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5 text-sm">
        <p className="font-semibold">Card payments aren't configured</p>
        <p className="mt-1 text-muted-foreground">
          The payments publishable key is missing, so escrow can't be funded right now. Your order
          has been saved and can be funded from the order page once payments are enabled.
        </p>
      </div>
    );
  }

  return (
    <Elements
      stripe={getStripe()}
      options={{
        mode: "payment",
        amount: totalCents,
        currency: "usd",
        paymentMethodCreation: "manual",
        appearance: { theme: "flat" },
      }}
    >
      <PaymentForm
        orders={orders}
        totalCents={totalCents}
        onFunded={onFunded}
        onCancel={onCancel}
      />
    </Elements>
  );
}

function PaymentForm({
  orders,
  totalCents,
  onFunded,
  onCancel,
}: {
  orders: PayableOrder[];
  totalCents: number;
  onFunded: () => void;
  onCancel?: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    try {
      // Validate + collect the card details held inside the Element.
      const { error: submitError } = await elements.submit();
      if (submitError) throw new Error(submitError.message ?? "Please check your card details.");

      for (const [index, order] of orders.entries()) {
        if (orders.length > 1) setProgress(`Funding order ${index + 1} of ${orders.length}…`);

        // Tokenise in the browser — raw card data never reaches our backend.
        const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({ elements });
        if (pmError || !paymentMethod) {
          throw new Error(pmError?.message ?? "We couldn't read that card.");
        }

        let result = await invokeFund(order.id, paymentMethod.id);

        // 3-D Secure: run the issuer challenge, then let the server re-read the
        // intent (the deterministic idempotency key means no second charge).
        if (result.status === "requires_action" && result.clientSecret) {
          setProgress("Confirming with your bank…");
          const { error: actionError } = await stripe.handleNextAction({
            clientSecret: result.clientSecret,
          });
          if (actionError) {
            throw new Error(actionError.message ?? "Card authentication failed.");
          }
          result = await invokeFund(order.id, paymentMethod.id);
        }

        if (result.status !== "escrow_funded") {
          throw new Error("The payment wasn't completed. No funds were placed in escrow.");
        }
      }

      setProgress(null);
      onFunded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed. Please try again.");
      setProgress(null);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={!stripe || busy}
        className="w-full bg-primary text-primary-foreground hover:bg-primary-hover"
      >
        {busy ? (
          <>
            <Loader2 className="mr-1 h-4 w-4 animate-spin" /> {progress ?? "Funding escrow…"}
          </>
        ) : (
          <>
            <ShieldCheck className="mr-1 h-4 w-4" /> Pay {formatCents(totalCents)} into escrow
          </>
        )}
      </Button>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="w-full text-xs font-semibold text-muted-foreground hover:text-primary disabled:opacity-50"
        >
          Pay later from my orders
        </button>
      )}

      <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <Lock className="h-3 w-3" /> Card details are handled by Stripe and never touch our servers.
      </p>
    </form>
  );
}
