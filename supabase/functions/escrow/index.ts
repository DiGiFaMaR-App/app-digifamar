// Escrow lifecycle Edge Function (money-moving; privileged).
//
// Ported from src/lib/escrow-v2/service.server.ts. Runs with the service role
// so it can write to escrow_ledger / wallets (both RLS-locked from clients),
// but every action authorizes the caller from their JWT first. The client
// invokes this via supabase.functions.invoke("escrow", { body: { action, ... } }).
//
// Actions: fund | generate-otp | confirm-delivery | release | raise-dispute
//          | resolve-dispute
//
// NOTE ON FUNDS: `fund` and `release` move REAL money through Stripe using
// Separate Charges and Transfers — `fund` confirms a PaymentIntent onto the
// platform account (no application_fee_amount) and `release` creates a Transfer
// to the farmer's connected account, sourced from the original charge. Live
// mode stays gated behind MONEY_TRANSMITTER_CLEARED (see _shared/stripe.ts).
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { adminClient, getUser } from "../_shared/supabase.ts";
import { sendSms } from "../_shared/sms.ts";
import { safeStripeError, stripeRequest } from "../_shared/stripe.ts";

const INSPECTION_WINDOW_HOURS = 48;
const OTP_TTL_HOURS = 72;

type OrderRow = {
  id: string;
  buyer_id: string;
  farmer_id: string;
  total_cents: number;
  platform_fee_cents: number;
  status: string;
  delivery_deadline: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_transfer_id: string | null;
};

const sb = adminClient();

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateOtpCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, "0");
}

async function loadOrder(orderId: string): Promise<OrderRow> {
  const { data, error } = await sb
    .from("orders")
    .select(
      "id, buyer_id, farmer_id, total_cents, platform_fee_cents, status, delivery_deadline, stripe_payment_intent_id, stripe_charge_id, stripe_transfer_id",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Order ${orderId} not found`);
  return data as OrderRow;
}

async function escrowBalanceForOrder(orderId: string): Promise<number> {
  const { data, error } = await sb
    .from("escrow_ledger")
    .select("entry_type, amount_cents")
    .eq("order_id", orderId);
  if (error) throw new Error(error.message);
  let held = 0;
  for (const row of data ?? []) {
    const t = row.entry_type as string;
    const a = Number(row.amount_cents);
    if (t === "fund") held += a;
    else if (t === "release" || t === "refund" || t === "penalty") held -= a;
  }
  return held;
}

async function appendLedger(
  orderId: string,
  entry_type: string,
  amount_cents: number,
  balance_after_cents: number,
  user_id: string | null,
  notes?: string,
) {
  const { error } = await sb.from("escrow_ledger").insert({
    order_id: orderId,
    entry_type,
    amount_cents,
    balance_after_cents,
    user_id,
    notes: notes ?? null,
  });
  if (error) throw new Error(`ledger insert failed: ${error.message}`);
}

async function creditAvailable(userId: string, amountCents: number) {
  if (amountCents <= 0) return;
  // Atomic increment (creates the wallet row if missing) — avoids the
  // read-modify-write race when two settlements land at once for one user.
  const { error } = await sb.rpc("wallet_credit", {
    p_user_id: userId,
    p_amount: amountCents,
  });
  if (error) throw new Error(error.message);
}

async function notify(userId: string, type: string, title: string, body: string, orderId: string) {
  // Best-effort in-app notification; never fail the money flow on this.
  await sb
    .from("notifications")
    .insert({ user_id: userId, type, title, body, data: { order_id: orderId } })
    .then(
      () => {},
      (e: unknown) => console.error("[escrow] notify failed", e),
    );
}

async function hasRole(userId: string, role: string): Promise<boolean> {
  const { data } = await sb.rpc("has_role", { _user_id: userId, _role: role });
  return Boolean(data);
}

// ── Action handlers ───────────────────────────────────────────────

async function fund(userId: string, orderId: string, paymentMethodId: string) {
  const order = await loadOrder(orderId);
  if (order.buyer_id !== userId) throw new Error("Forbidden");
  if (!["pending", "negotiating"].includes(order.status)) {
    throw new Error(`Order in state ${order.status} cannot be funded`);
  }
  if (!paymentMethodId) throw new Error("A payment method is required to fund this order");

  type Intent = {
    id: string;
    status: string;
    client_secret?: string | null;
    latest_charge?: string | { id: string } | null;
    last_payment_error?: { message?: string } | null;
  };
  let intent: Intent | null = null;

  // A previous attempt may have left a PaymentIntent behind (typically a 3-D
  // Secure challenge the buyer has since completed in the browser). Re-read it
  // rather than POSTing again: an idempotent replay would return the stale
  // "requires_action" body and the buyer would loop forever.
  if (order.stripe_payment_intent_id) {
    try {
      const existing: Intent = await stripeRequest(
        `/payment_intents/${order.stripe_payment_intent_id}`,
      );
      if (["succeeded", "requires_action", "requires_confirmation"].includes(existing.status)) {
        intent = existing;
      }
    } catch (e) {
      console.error(`[escrow] could not re-read intent for ${orderId}:`, (e as Error).message);
    }
  }

  // Charge the buyer. Deterministic idempotency key: a retry (double-click,
  // network retry) returns the SAME PaymentIntent instead of charging twice.
  if (!intent) {
    try {
      intent = await stripeRequest("/payment_intents", {
        idempotencyKey: `pi_create:${orderId}`,
        body: {
          amount: order.total_cents,
          currency: "usd",
          payment_method: paymentMethodId,
          confirm: "true",
          // Separate Charges and Transfers: funds land on the platform account
          // and are transferred to the farmer at release time. No
          // application_fee_amount, no on_behalf_of.
          transfer_group: `order_${orderId}`,
          automatic_payment_methods: { enabled: "true", allow_redirects: "never" },
          metadata: { order_id: orderId, buyer_id: order.buyer_id, farmer_id: order.farmer_id },
        },
      });
    } catch (e) {
      throw new Error(
        safeStripeError(
          e,
          `fund order ${orderId}`,
          "We couldn't process that payment. Please try another card.",
        ),
      );
    }
  }
  if (!intent) throw new Error("We couldn't start that payment. Please try again.");

  const chargeId =
    typeof intent.latest_charge === "string"
      ? intent.latest_charge
      : (intent.latest_charge?.id ?? null);

  // 3-D Secure / SCA: the card issuer wants the buyer to authenticate. Hand the
  // client secret back so the browser can run the challenge, then the client
  // re-invokes `fund` (the deterministic idempotency key returns the SAME
  // PaymentIntent, so nobody is charged twice).
  if (
    (intent.status === "requires_action" || intent.status === "requires_confirmation") &&
    intent.client_secret
  ) {
    await sb
      .from("orders")
      .update({ stripe_payment_intent_id: intent.id, stripe_charge_id: chargeId })
      .eq("id", orderId);
    return {
      orderId,
      status: "requires_action" as const,
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
    };
  }

  if (intent.status !== "succeeded") {
    await sb
      .from("orders")
      .update({ stripe_payment_intent_id: intent.id, stripe_charge_id: chargeId })
      .eq("id", orderId);
    console.error(
      `[escrow] fund ${orderId} not succeeded:`,
      intent.status,
      intent.last_payment_error?.message,
    );
    throw new Error("The payment was not completed. No funds were placed in escrow.");
  }

  // Payment succeeded — only now does the order become funded. The webhook
  // handler performs the same write idempotently if it lands first.
  const balanceAfter = (await escrowBalanceForOrder(orderId)) + order.total_cents;
  await appendLedger(
    orderId,
    "fund",
    order.total_cents,
    balanceAfter,
    userId,
    `buyer funded escrow (${intent.id})`,
  );
  const { error } = await sb
    .from("orders")
    .update({
      status: "escrow_funded",
      stripe_payment_intent_id: intent.id,
      stripe_charge_id: chargeId,
    })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
  await notify(
    order.farmer_id,
    "order",
    "Order funded",
    "A buyer funded escrow for an order.",
    orderId,
  );
  return { orderId, status: "escrow_funded", heldCents: balanceAfter, paymentIntentId: intent.id };
}

async function generateOtp(userId: string, orderId: string) {
  const order = await loadOrder(orderId);
  if (order.farmer_id !== userId) throw new Error("Forbidden");
  if (!["escrow_funded", "awaiting_delivery", "shipped"].includes(order.status)) {
    throw new Error(`Order in state ${order.status} cannot receive an OTP yet`);
  }
  const otp = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_HOURS * 3600 * 1000).toISOString();
  const { error } = await sb.from("delivery_confirmations").upsert(
    {
      order_id: orderId,
      otp_hash: await sha256Hex(otp),
      otp_expires_at: expiresAt,
      confirmed_at: null,
      attempts: 0,
    },
    { onConflict: "order_id" },
  );
  if (error) throw new Error(error.message);
  await sb.from("orders").update({ status: "awaiting_delivery" }).eq("id", orderId);

  const { data: buyer } = await sb
    .from("profiles")
    .select("phone")
    .eq("id", order.buyer_id)
    .maybeSingle();
  const phone = buyer?.phone ?? null;
  const smsDelivered = await sendSms(
    phone,
    `DiGiFaMaR: your delivery code for order ${orderId.slice(0, 8)} is ${otp}. Share it with the farmer at handover. Expires in ${OTP_TTL_HOURS}h.`,
  );
  const maskedPhone = phone ? phone.replace(/.(?=.{2})/g, "•") : null;
  await notify(
    order.buyer_id,
    "otp",
    "Delivery code ready",
    "Your delivery code is ready for handover.",
    orderId,
  );
  return {
    orderId,
    expiresAt,
    smsDelivered,
    maskedPhone,
    otp: smsDelivered ? null : otp, // fallback in dev when SMS unconfigured
  };
}

async function confirmDelivery(userId: string, orderId: string, otp: string) {
  const order = await loadOrder(orderId);
  if (order.farmer_id !== userId) throw new Error("Forbidden");
  if (!["awaiting_delivery", "shipped"].includes(order.status)) {
    throw new Error(`Order in state ${order.status} cannot be confirmed`);
  }
  const { data: conf, error } = await sb
    .from("delivery_confirmations")
    .select("otp_hash, otp_expires_at, confirmed_at, attempts")
    .eq("order_id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!conf) throw new Error("No delivery code generated for this order");
  if (conf.confirmed_at) throw new Error("Delivery already confirmed");
  if (new Date(conf.otp_expires_at).getTime() < Date.now())
    throw new Error("Delivery code has expired");
  if (Number(conf.attempts ?? 0) >= 5)
    throw new Error("Too many failed attempts. Ask the buyer for a new code.");
  if ((await sha256Hex(otp)) !== conf.otp_hash) {
    await sb
      .from("delivery_confirmations")
      .update({ attempts: Number(conf.attempts ?? 0) + 1 })
      .eq("order_id", orderId);
    throw new Error("Invalid delivery code");
  }
  const now = new Date();
  const closesAt = new Date(now.getTime() + INSPECTION_WINDOW_HOURS * 3600 * 1000);
  await sb
    .from("delivery_confirmations")
    .update({ confirmed_at: now.toISOString() })
    .eq("order_id", orderId);
  await sb.from("inspection_windows").upsert(
    {
      order_id: orderId,
      opens_at: now.toISOString(),
      closes_at: closesAt.toISOString(),
      auto_release_at: closesAt.toISOString(),
    },
    { onConflict: "order_id" },
  );
  await sb.from("orders").update({ status: "inspection" }).eq("id", orderId);
  await notify(
    order.buyer_id,
    "order",
    "Delivery confirmed",
    "Inspect your order; funds auto-release after the window.",
    orderId,
  );
  return { orderId, status: "inspection", autoReleaseAt: closesAt.toISOString() };
}

async function release(userId: string, orderId: string) {
  const order = await loadOrder(orderId);
  if (order.buyer_id !== userId) throw new Error("Forbidden");
  if (!["inspection", "delivered"].includes(order.status)) {
    throw new Error(`Order in state ${order.status} cannot be released`);
  }
  const held = await escrowBalanceForOrder(orderId);
  if (held <= 0) throw new Error("No funds in escrow for this order");
  if (!order.stripe_charge_id) throw new Error("This order has no settled payment to release");

  // The farmer must have a payout-ready connected account.
  const { data: farmer } = await sb
    .from("profiles")
    .select("stripe_account_id, stripe_account_status")
    .eq("id", order.farmer_id)
    .maybeSingle();
  if (!farmer?.stripe_account_id || farmer.stripe_account_status !== "active") {
    throw new Error(
      "The farmer's payout account isn't ready yet. Funds stay in escrow until it is.",
    );
  }

  // Farmer receives the total minus the platform fee. The escrow fee stays on
  // the platform balance too. source_transaction ties the transfer to the
  // original charge so it can't fail on available-balance timing.
  const transferAmount = Math.max(0, order.total_cents - order.platform_fee_cents);
  let transfer: { id: string };
  try {
    transfer = await stripeRequest("/transfers", {
      idempotencyKey: `transfer:${orderId}:release`,
      body: {
        amount: transferAmount,
        currency: "usd",
        destination: farmer.stripe_account_id,
        source_transaction: order.stripe_charge_id,
        transfer_group: `order_${orderId}`,
        metadata: { order_id: orderId, buyer_id: order.buyer_id, farmer_id: order.farmer_id },
      },
    });
  } catch (e) {
    throw new Error(
      safeStripeError(
        e,
        `release order ${orderId}`,
        "We couldn't pay out this order right now. Funds remain in escrow.",
      ),
    );
  }

  await appendLedger(orderId, "release", held, 0, userId, `buyer released funds (${transfer.id})`);
  await sb
    .from("orders")
    .update({ status: "released", stripe_transfer_id: transfer.id })
    .eq("id", orderId);
  await sb
    .from("inspection_windows")
    .update({ released_at: new Date().toISOString() })
    .eq("order_id", orderId);
  await notify(
    order.farmer_id,
    "funds",
    "Funds released",
    "Escrow funds were paid out to your Stripe account.",
    orderId,
  );
  return {
    orderId,
    status: "released",
    releasedCents: held,
    transferredCents: transferAmount,
    transferId: transfer.id,
  };
}

async function raiseDispute(
  userId: string,
  input: { orderId: string; reason: string; evidenceUrls: string[] },
) {
  const order = await loadOrder(input.orderId);
  if (order.buyer_id !== userId && order.farmer_id !== userId) throw new Error("Forbidden");
  if (!["inspection", "delivered", "awaiting_delivery", "escrow_funded"].includes(order.status)) {
    throw new Error(`Order in state ${order.status} cannot be disputed`);
  }
  const { data, error } = await sb
    .from("disputes")
    .insert({
      order_id: input.orderId,
      raised_by: userId,
      reason: input.reason,
      evidence_urls: input.evidenceUrls,
      state: "open",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await sb.from("orders").update({ status: "disputed" }).eq("id", input.orderId);
  const other = order.buyer_id === userId ? order.farmer_id : order.buyer_id;
  await notify(
    other,
    "dispute",
    "Dispute raised",
    "A dispute was opened on your order.",
    input.orderId,
  );
  return data;
}

async function resolveDispute(
  adminId: string,
  input: {
    disputeId: string;
    outcome: "release" | "refund" | "split";
    buyerRefundCents?: number;
    resolution: string;
  },
) {
  if (!(await hasRole(adminId, "admin"))) throw new Error("Forbidden");
  if (!["release", "refund", "split"].includes(input.outcome)) {
    throw new Error(`Invalid dispute outcome: ${input.outcome}`);
  }
  if (input.outcome === "split" && !(Number(input.buyerRefundCents) >= 0)) {
    throw new Error("A non-negative buyerRefundCents is required for a split outcome");
  }
  const { data: dispute, error: dErr } = await sb
    .from("disputes")
    .select("id, order_id, state")
    .eq("id", input.disputeId)
    .maybeSingle();
  if (dErr) throw new Error(dErr.message);
  if (!dispute) throw new Error("Dispute not found");
  if (["resolved", "rejected"].includes(dispute.state)) throw new Error("Dispute already resolved");

  const order = await loadOrder(dispute.order_id);
  const held = await escrowBalanceForOrder(dispute.order_id);
  if (held <= 0) throw new Error("No funds in escrow");

  if (input.outcome === "release") {
    await appendLedger(order.id, "release", held, 0, adminId, "admin: release to farmer");
    await creditAvailable(order.farmer_id, held);
    await sb.from("orders").update({ status: "released" }).eq("id", order.id);
  } else if (input.outcome === "refund") {
    await appendLedger(order.id, "refund", held, 0, adminId, "admin: full refund to buyer");
    await creditAvailable(order.buyer_id, held);
    await sb.from("orders").update({ status: "refunded" }).eq("id", order.id);
  } else {
    const refund = Math.max(0, Math.min(held, input.buyerRefundCents ?? 0));
    const rel = held - refund;
    if (refund > 0) {
      await appendLedger(
        order.id,
        "refund",
        refund,
        held - refund,
        adminId,
        "admin: partial refund",
      );
      await creditAvailable(order.buyer_id, refund);
    }
    if (rel > 0) {
      await appendLedger(order.id, "release", rel, 0, adminId, "admin: partial release");
      await creditAvailable(order.farmer_id, rel);
    }
    await sb.from("orders").update({ status: "released" }).eq("id", order.id);
  }
  await sb
    .from("disputes")
    .update({
      state: "resolved",
      resolution: input.resolution,
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", input.disputeId);
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);
  try {
    const user = await getUser(req);
    if (!user) return errorResponse("Unauthorized", 401);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    switch (action) {
      case "fund":
        return jsonResponse(
          await fund(user.id, String(body.orderId), String(body.paymentMethodId ?? "")),
        );
      case "generate-otp":
        return jsonResponse(await generateOtp(user.id, String(body.orderId)));
      case "confirm-delivery":
        return jsonResponse(await confirmDelivery(user.id, String(body.orderId), String(body.otp)));
      case "release":
        return jsonResponse(await release(user.id, String(body.orderId)));
      case "raise-dispute":
        return jsonResponse(
          await raiseDispute(user.id, {
            orderId: String(body.orderId),
            reason: String(body.reason ?? ""),
            evidenceUrls: Array.isArray(body.evidenceUrls) ? body.evidenceUrls : [],
          }),
        );
      case "resolve-dispute":
        return jsonResponse(
          await resolveDispute(user.id, {
            disputeId: String(body.disputeId),
            outcome: body.outcome,
            buyerRefundCents: body.buyerRefundCents,
            resolution: String(body.resolution ?? ""),
          }),
        );
      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (e) {
    return errorResponse((e as Error)?.message ?? "escrow error", 400);
  }
});
