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
// NOTE ON FUNDS: `fund` records a *simulated* escrow hold in the ledger. No
// real money moves here. Real settlement/payout is a separate, gated concern
// (see the create-payout function) and must not be enabled until money-
// transmitter licensing is resolved.
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { adminClient, getUser } from "../_shared/supabase.ts";

const INSPECTION_WINDOW_HOURS = 48;
const OTP_TTL_HOURS = 72;

type OrderRow = {
  id: string;
  buyer_id: string;
  farmer_id: string;
  total_cents: number;
  status: string;
  delivery_deadline: string | null;
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
    .select("id, buyer_id, farmer_id, total_cents, status, delivery_deadline")
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

async function ensureWallet(userId: string) {
  await sb.from("wallets").insert({ user_id: userId }).select().maybeSingle();
}

async function creditAvailable(userId: string, amountCents: number) {
  if (amountCents <= 0) return;
  await ensureWallet(userId);
  const { data, error } = await sb
    .from("wallets")
    .select("available_balance_cents")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const next = Number(data?.available_balance_cents ?? 0) + amountCents;
  const { error: uerr } = await sb
    .from("wallets")
    .update({ available_balance_cents: next })
    .eq("user_id", userId);
  if (uerr) throw new Error(uerr.message);
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

/** Best-effort SMS via Vonage. Returns whether it was sent. */
async function sendSms(to: string | null | undefined, body: string): Promise<boolean> {
  const apiKey = Deno.env.get("VONAGE_API_KEY");
  const apiSecret = Deno.env.get("VONAGE_API_SECRET");
  const from = Deno.env.get("VONAGE_FROM");
  if (!apiKey || !apiSecret || !from || !to) return false;
  const e164 = to.replace(/[^\d+]/g, "");
  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      api_secret: apiSecret,
      from,
      to: e164.replace(/^\+/, ""),
      text: body,
    });
    const res = await fetch("https://rest.nexmo.com/sms/json", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: params.toString(),
    });
    if (!res.ok) return false;
    const payload = await res.json().catch(() => ({}));
    return payload?.messages?.[0]?.status === "0";
  } catch (e) {
    console.error("[escrow] sms failed", e);
    return false;
  }
}

async function hasRole(userId: string, role: string): Promise<boolean> {
  const { data } = await sb.rpc("has_role", { _user_id: userId, _role: role });
  return Boolean(data);
}

// ── Action handlers ───────────────────────────────────────────────

async function fund(userId: string, orderId: string) {
  const order = await loadOrder(orderId);
  if (order.buyer_id !== userId) throw new Error("Forbidden");
  if (!["pending", "negotiating"].includes(order.status)) {
    throw new Error(`Order in state ${order.status} cannot be funded`);
  }
  const balanceAfter = (await escrowBalanceForOrder(orderId)) + order.total_cents;
  await appendLedger(orderId, "fund", order.total_cents, balanceAfter, userId, "buyer funded escrow");
  const { error } = await sb.from("orders").update({ status: "escrow_funded" }).eq("id", orderId);
  if (error) throw new Error(error.message);
  await notify(order.farmer_id, "order", "Order funded", "A buyer funded escrow for an order.", orderId);
  return { orderId, status: "escrow_funded", heldCents: balanceAfter };
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
    { order_id: orderId, otp_hash: await sha256Hex(otp), otp_expires_at: expiresAt, confirmed_at: null, attempts: 0 },
    { onConflict: "order_id" },
  );
  if (error) throw new Error(error.message);
  await sb.from("orders").update({ status: "awaiting_delivery" }).eq("id", orderId);

  const { data: buyer } = await sb.from("profiles").select("phone").eq("id", order.buyer_id).maybeSingle();
  const phone = buyer?.phone ?? null;
  const smsDelivered = await sendSms(
    phone,
    `DiGiFaMaR: your delivery code for order ${orderId.slice(0, 8)} is ${otp}. Share it with the farmer at handover. Expires in ${OTP_TTL_HOURS}h.`,
  );
  const maskedPhone = phone ? phone.replace(/.(?=.{2})/g, "•") : null;
  await notify(order.buyer_id, "otp", "Delivery code ready", "Your delivery code is ready for handover.", orderId);
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
  if (new Date(conf.otp_expires_at).getTime() < Date.now()) throw new Error("Delivery code has expired");
  if (Number(conf.attempts ?? 0) >= 5) throw new Error("Too many failed attempts. Ask the buyer for a new code.");
  if ((await sha256Hex(otp)) !== conf.otp_hash) {
    await sb
      .from("delivery_confirmations")
      .update({ attempts: Number(conf.attempts ?? 0) + 1 })
      .eq("order_id", orderId);
    throw new Error("Invalid delivery code");
  }
  const now = new Date();
  const closesAt = new Date(now.getTime() + INSPECTION_WINDOW_HOURS * 3600 * 1000);
  await sb.from("delivery_confirmations").update({ confirmed_at: now.toISOString() }).eq("order_id", orderId);
  await sb.from("inspection_windows").upsert(
    { order_id: orderId, opens_at: now.toISOString(), closes_at: closesAt.toISOString(), auto_release_at: closesAt.toISOString() },
    { onConflict: "order_id" },
  );
  await sb.from("orders").update({ status: "inspection" }).eq("id", orderId);
  await notify(order.buyer_id, "order", "Delivery confirmed", "Inspect your order; funds auto-release after the window.", orderId);
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
  await appendLedger(orderId, "release", held, 0, userId, "buyer released funds");
  await creditAvailable(order.farmer_id, held);
  await sb.from("orders").update({ status: "released" }).eq("id", orderId);
  await sb.from("inspection_windows").update({ released_at: new Date().toISOString() }).eq("order_id", orderId);
  await notify(order.farmer_id, "funds", "Funds released", "Escrow funds were released to your wallet.", orderId);
  return { orderId, status: "released", releasedCents: held };
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
  await notify(other, "dispute", "Dispute raised", "A dispute was opened on your order.", input.orderId);
  return data;
}

async function resolveDispute(
  adminId: string,
  input: { disputeId: string; outcome: "release" | "refund" | "split"; buyerRefundCents?: number; resolution: string },
) {
  if (!(await hasRole(adminId, "admin"))) throw new Error("Forbidden");
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
      await appendLedger(order.id, "refund", refund, held - refund, adminId, "admin: partial refund");
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
    .update({ state: "resolved", resolution: input.resolution, resolved_by: adminId, resolved_at: new Date().toISOString() })
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
        return jsonResponse(await fund(user.id, String(body.orderId)));
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
