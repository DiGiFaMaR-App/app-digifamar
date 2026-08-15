// Stripe webhook receiver.
//
// Verifies the Stripe signature against the environment's webhook secret
// (sandbox -> PAYMENTS_SANDBOX_WEBHOOK_SECRET, live -> PAYMENTS_LIVE_WEBHOOK_SECRET;
// see ../_shared/stripe.ts) BEFORE touching any payload data, then reconciles
// our own escrow state.
//
// This function must be deployed with verify_jwt = false — Stripe never sends a
// Supabase session token. Security comes from the signature check.
//
// Handled events:
//   payment_intent.succeeded      -> mark escrow_funded + ledger row (idempotent)
//   payment_intent.payment_failed -> notify the buyer
//   transfer.reversed             -> real clawback: order -> disputed + ledger entry
//   account.updated /
//   capability.updated            -> sync profiles.stripe_account_status
//   charge.dispute.created        -> notify (card-network chargeback)
import { adminClient } from "../_shared/supabase.ts";
import { verifyStripeSignature, webhookSecret } from "../_shared/stripe.ts";

const sb = adminClient();

// deno-lint-ignore no-explicit-any
type Obj = Record<string, any>;

async function notify(userId: string | null, type: string, title: string, body: string, data: Obj) {
  if (!userId) return;
  await sb
    .from("notifications")
    .insert({ user_id: userId, type, title, body, data })
    .then(
      () => {},
      (e: unknown) => console.error("[stripe-webhook] notify failed", e),
    );
}

async function escrowBalance(orderId: string): Promise<number> {
  const { data, error } = await sb
    .from("escrow_ledger")
    .select("entry_type, amount_cents")
    .eq("order_id", orderId);
  if (error) throw new Error(error.message);
  let held = 0;
  for (const row of data ?? []) {
    const a = Number(row.amount_cents);
    if (row.entry_type === "fund") held += a;
    else held -= a;
  }
  return held;
}

async function orderByPaymentIntent(pi: string) {
  const { data } = await sb
    .from("orders")
    .select("id, buyer_id, farmer_id, total_cents, status, stripe_payment_intent_id")
    .eq("stripe_payment_intent_id", pi)
    .maybeSingle();
  return data;
}

async function handlePaymentSucceeded(intent: Obj) {
  const orderId = intent.metadata?.order_id ?? (await orderByPaymentIntent(intent.id))?.id;
  if (!orderId) {
    console.warn("[stripe-webhook] payment_intent.succeeded with no order_id", intent.id);
    return;
  }
  const { data: order } = await sb
    .from("orders")
    .select("id, buyer_id, farmer_id, total_cents, status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) throw new Error(`order ${orderId} not found for ${intent.id}`);

  const chargeId =
    typeof intent.latest_charge === "string"
      ? intent.latest_charge
      : (intent.latest_charge?.id ?? null);

  // Idempotent: if a fund entry already exists for this order, only backfill ids.
  const { data: existing } = await sb
    .from("escrow_ledger")
    .select("id")
    .eq("order_id", orderId)
    .eq("entry_type", "fund")
    .limit(1);
  if (existing && existing.length > 0) {
    await sb
      .from("orders")
      .update({ stripe_payment_intent_id: intent.id, stripe_charge_id: chargeId })
      .eq("id", orderId);
    return;
  }

  const balanceAfter = (await escrowBalance(orderId)) + Number(order.total_cents);
  const { error: lErr } = await sb.from("escrow_ledger").insert({
    order_id: orderId,
    entry_type: "fund",
    amount_cents: order.total_cents,
    balance_after_cents: balanceAfter,
    user_id: order.buyer_id,
    notes: `stripe webhook: payment_intent.succeeded (${intent.id})`,
  });
  if (lErr) throw new Error(`ledger insert failed: ${lErr.message}`);

  const { error: oErr } = await sb
    .from("orders")
    .update({
      status: "escrow_funded",
      stripe_payment_intent_id: intent.id,
      stripe_charge_id: chargeId,
    })
    .eq("id", orderId);
  if (oErr) throw new Error(oErr.message);

  await notify(order.farmer_id, "order", "Order funded", "A buyer funded escrow for an order.", {
    order_id: orderId,
  });
}

async function handlePaymentFailed(intent: Obj) {
  const orderId = intent.metadata?.order_id ?? null;
  const buyerId = intent.metadata?.buyer_id ?? null;
  console.warn("[stripe-webhook] payment failed", intent.id, intent.last_payment_error?.code);
  await notify(
    buyerId,
    "payment",
    "Payment failed",
    "Your payment didn't go through. No funds were held.",
    {
      order_id: orderId,
      payment_intent_id: intent.id,
    },
  );
}

async function handleTransferReversed(transfer: Obj) {
  // A real clawback of money already paid to a farmer — must never be swallowed.
  const orderId = transfer.metadata?.order_id ?? null;
  const { data: order } = orderId
    ? await sb.from("orders").select("id, buyer_id, farmer_id").eq("id", orderId).maybeSingle()
    : await sb
        .from("orders")
        .select("id, buyer_id, farmer_id")
        .eq("stripe_transfer_id", transfer.id)
        .maybeSingle();
  if (!order) throw new Error(`transfer.reversed ${transfer.id}: no matching order`);

  const reversed = Number(transfer.amount_reversed ?? transfer.amount ?? 0);
  const balanceAfter = (await escrowBalance(order.id)) + reversed;
  const { error: lErr } = await sb.from("escrow_ledger").insert({
    order_id: order.id,
    entry_type: "reversal",
    amount_cents: reversed,
    balance_after_cents: balanceAfter,
    user_id: order.farmer_id,
    notes: `stripe webhook: transfer.reversed (${transfer.id})`,
  });
  if (lErr) throw new Error(`reversal ledger insert failed: ${lErr.message}`);

  const { error: oErr } = await sb.from("orders").update({ status: "disputed" }).eq("id", order.id);
  if (oErr) throw new Error(oErr.message);

  await notify(
    order.farmer_id,
    "funds",
    "Payout reversed",
    "A payout for one of your orders was reversed.",
    {
      order_id: order.id,
      transfer_id: transfer.id,
    },
  );
  await notify(
    order.buyer_id,
    "funds",
    "Order payout reversed",
    "A payout on your order was reversed and it is under review.",
    {
      order_id: order.id,
    },
  );
}

function statusFromAccount(acct: Obj): "pending" | "active" | "restricted" {
  if (acct.capabilities?.transfers === "active" && acct.payouts_enabled) return "active";
  if (acct.requirements?.disabled_reason) return "restricted";
  return "pending";
}

async function handleAccountUpdated(acct: Obj) {
  const accountId = acct.id ?? acct.account;
  if (!accountId) return;
  const status = statusFromAccount(acct);
  const { error } = await sb
    .from("profiles")
    .update({ stripe_account_status: status })
    .eq("stripe_account_id", accountId);
  if (error) throw new Error(error.message);
}

async function handleCapabilityUpdated(capability: Obj, accountId: string | null) {
  const id = accountId ?? capability.account;
  if (!id || capability.id !== "transfers") return;
  const status =
    capability.status === "active"
      ? "active"
      : capability.status === "inactive"
        ? "restricted"
        : "pending";
  const { error } = await sb
    .from("profiles")
    .update({ stripe_account_status: status })
    .eq("stripe_account_id", id);
  if (error) throw new Error(error.message);
}

async function handleChargeDispute(dispute: Obj) {
  // Card-network chargeback — distinct from this app's internal dispute flow.
  const { data: order } = await sb
    .from("orders")
    .select("id, buyer_id, farmer_id")
    .eq("stripe_charge_id", dispute.charge)
    .maybeSingle();
  console.warn(
    "[stripe-webhook] chargeback",
    dispute.id,
    "charge",
    dispute.charge,
    "order",
    order?.id,
  );
  if (!order) return;
  await notify(
    order.farmer_id,
    "dispute",
    "Card chargeback opened",
    "The buyer's bank opened a chargeback on this order.",
    {
      order_id: order.id,
      chargeback_id: dispute.id,
      reason: dispute.reason ?? null,
    },
  );
}

// --- Subscriptions (farmer plans + VIP verification badge) ------------------
// Upsert on stripe_subscription_id keeps this idempotent across retries. The
// subscriptions trigger mirrors entitlements onto farmer_profiles (vip_badge
// and plan), so cancelled-but-paid-through rows keep access until period end.
const PLAN_LABELS: Record<string, string> = {
  pro_monthly: "Pro",
  elite_monthly: "Elite",
};

function subjectFor(priceId: string | null): string {
  if (!priceId) return "Your subscription";
  if (priceId === "vip_badge_monthly") return "Your VIP verification badge";
  const plan = PLAN_LABELS[priceId];
  return plan ? `Your ${plan} plan` : "Your subscription";
}

async function handleSubscriptionEvent(sub: Obj, livemode: boolean, deleted = false) {
  const item = sub.items?.data?.[0];
  const userId = sub.metadata?.userId ?? null;
  const priceId = item?.price?.lookup_key ?? item?.price?.metadata?.lovable_external_id ??
    item?.price?.id ?? null;
  const periodStart = item?.current_period_start ?? sub.current_period_start;
  const periodEnd = item?.current_period_end ?? sub.current_period_end;
  const status = deleted ? "canceled" : sub.status;
  const environment = livemode ? "live" : "sandbox";

  if (!userId) {
    console.error("[stripe-webhook] subscription without metadata.userId", sub.id);
    return;
  }

  const { error } = await sb.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: sub.id,
      stripe_customer_id: sub.customer,
      product_id: item?.price?.product ?? null,
      price_id: priceId,
      status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: Boolean(sub.cancel_at_period_end),
      environment,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
  if (error) throw new Error(error.message);

  const subject = subjectFor(priceId);

  if (deleted) {
    await notify(userId, "subscription", `${subject} ended`, `${subject} has ended. You can resubscribe any time from Billing.`, { subscription_id: sub.id, price_id: priceId });
  } else if (status === "active" || status === "trialing") {
    await notify(userId, "subscription", `${subject} is active`, `${subject} is active on your DiGiFaMaR account.`, { subscription_id: sub.id, price_id: priceId });
  } else if (status === "past_due") {
    await notify(userId, "subscription", "Payment failed", `We couldn't charge your card for ${subject.toLowerCase()}. Update your payment method in Billing to keep it — Stripe will retry.`, { subscription_id: sub.id, price_id: priceId });
  }
}

// --- Invoices (renewals, receipts, dunning) ---------------------------------
// Renewal money events do not change entitlements on their own — the paired
// customer.subscription.updated event does. These only inform the customer.
async function handleInvoiceEvent(invoice: Obj, livemode: boolean, failed: boolean) {
  const subscriptionId = invoice.subscription ??
    invoice.parent?.subscription_details?.subscription ?? null;
  if (!subscriptionId) return;

  const environment = livemode ? "live" : "sandbox";
  const { data: row } = await sb
    .from("subscriptions")
    .select("user_id, price_id")
    .eq("stripe_subscription_id", subscriptionId)
    .eq("environment", environment)
    .maybeSingle();
  if (!row?.user_id) return;

  const subject = subjectFor(row.price_id ?? null);
  const amount = typeof invoice.amount_due === "number"
    ? `$${(invoice.amount_due / 100).toFixed(2)}`
    : null;

  if (failed) {
    await notify(
      row.user_id,
      "subscription",
      "Payment failed",
      `We couldn't collect ${amount ?? "your renewal payment"} for ${subject.toLowerCase()}. Update your card in Billing — Stripe will retry over the next few days.`,
      { invoice_id: invoice.id, subscription_id: subscriptionId, hosted_invoice_url: invoice.hosted_invoice_url ?? null },
    );
  } else {
    await notify(
      row.user_id,
      "subscription",
      "Payment received",
      `${subject} renewed${amount ? ` for ${amount}` : ""}. Your receipt is available in the billing portal.`,
      { invoice_id: invoice.id, subscription_id: subscriptionId, hosted_invoice_url: invoice.hosted_invoice_url ?? null },
    );
  }
}

Deno.serve(async (req) => {

  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let event: Obj;
  try {
    const payload = await req.text();
    await verifyStripeSignature(payload, req.headers.get("stripe-signature"), webhookSecret());
    event = JSON.parse(payload);
  } catch (e) {
    console.error("[stripe-webhook] signature verification failed:", (e as Error).message);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    const obj = event.data?.object ?? {};
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(obj);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentFailed(obj);
        break;
      case "transfer.reversed":
        await handleTransferReversed(obj);
        break;
      case "account.updated":
        await handleAccountUpdated(obj);
        break;
      case "capability.updated":
        await handleCapabilityUpdated(obj, event.account ?? null);
        break;
      case "charge.dispute.created":
        await handleChargeDispute(obj);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionEvent(obj, Boolean(event.livemode));
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionEvent(obj, Boolean(event.livemode), true);
        break;

      default:
        console.log("[stripe-webhook] unhandled event", event.type);
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    // Return 500 so Stripe retries — a swallowed clawback is worse than a retry.
    console.error("[stripe-webhook] handler error", event.type, (e as Error).message);
    return new Response("Handler error", { status: 500 });
  }
});
