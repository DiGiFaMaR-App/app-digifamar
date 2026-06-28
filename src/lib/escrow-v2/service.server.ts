/**
 * Escrow-v2 — server-side service.
 *
 * All money-moving operations live here. The frontend never touches
 * wallets, escrow_ledger, delivery_confirmations, inspection_windows
 * directly; it calls one of the server functions in escrow.functions.ts,
 * which delegate to this service.
 *
 * SECURITY: this module uses `supabaseAdmin` (service role) so we can
 * write to escrow_ledger and wallets, both of which are locked behind
 * RLS for normal users. Every public method MUST do its own authorization
 * checks based on the caller's userId — never trust input.
 */
import { createHash, randomInt } from "crypto";

const INSPECTION_WINDOW_HOURS = 48;
const OTP_TTL_HOURS = 72;
const FARMER_GHOST_PENALTY_PCT = 0.5;

type OrderRow = {
  id: string;
  buyer_id: string;
  farmer_id: string;
  total_cents: number;
  status: string;
  delivery_deadline: string | null;
};

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function audit(entry: import("@/lib/audit/log.server").AuditEntry) {
  const { logAudit } = await import("@/lib/audit/log.server");
  await logAudit(entry);
}

function hashOtp(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

function generateOtp(): string {
  // 6-digit numeric, zero-padded
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

async function loadOrder(orderId: string): Promise<OrderRow> {
  const sb = await getAdmin();
  const { data, error } = await sb
    .from("orders")
    .select("id, buyer_id, farmer_id, total_cents, status, delivery_deadline")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Order ${orderId} not found`);
  return data as OrderRow;
}

async function appendLedger(
  orderId: string,
  entry_type: "fund" | "hold" | "release" | "refund" | "penalty",
  amount_cents: number,
  balance_after_cents: number,
  user_id: string | null,
  notes?: string,
) {
  const sb = await getAdmin();
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

async function escrowBalanceForOrder(orderId: string): Promise<number> {
  const sb = await getAdmin();
  const { data, error } = await sb
    .from("escrow_ledger")
    .select("entry_type, amount_cents")
    .eq("order_id", orderId);
  if (error) throw new Error(error.message);
  // held = fund - release - refund - penalty
  let held = 0;
  for (const row of data ?? []) {
    const t = row.entry_type as string;
    const a = Number(row.amount_cents);
    if (t === "fund") held += a;
    else if (t === "hold") {/* book-keeping only */}
    else if (t === "release" || t === "refund" || t === "penalty") held -= a;
  }
  return held;
}

async function ensureWallet(userId: string) {
  const sb = await getAdmin();
  await sb.from("wallets").insert({ user_id: userId }).select().maybeSingle();
  // ignore conflict (wallet may already exist via trigger)
}

async function creditAvailable(userId: string, amountCents: number) {
  if (amountCents <= 0) return;
  const sb = await getAdmin();
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

export class EscrowV2Service {
  /** Step 1 — Buyer funds escrow. Moves the order into `escrow_funded`. */
  static async fund(userId: string, orderId: string) {
    const order = await loadOrder(orderId);
    if (order.buyer_id !== userId) throw new Error("Forbidden");
    if (!["pending", "negotiating"].includes(order.status)) {
      throw new Error(`Order in state ${order.status} cannot be funded`);
    }
    const sb = await getAdmin();

    // Simulated payment — in production wire to Stripe / Escrow.com here.
    const balanceAfter = await escrowBalanceForOrder(orderId) + order.total_cents;
    await appendLedger(orderId, "fund", order.total_cents, balanceAfter, userId, "buyer funded escrow");
    await appendLedger(orderId, "hold", order.total_cents, balanceAfter, userId, "funds held in escrow");

    const { error } = await sb
      .from("orders")
      .update({ status: "escrow_funded" })
      .eq("id", orderId);
    if (error) throw new Error(error.message);

    await audit({
      actorId: userId,
      actorRole: "buyer",
      action: "escrow.fund",
      resourceType: "order",
      resourceId: orderId,
      metadata: { amount_cents: order.total_cents },
    });
    return { orderId, status: "escrow_funded" as const, heldCents: balanceAfter };
  }

  /** Step 2 — Farmer requests an OTP for the buyer. Returns the plaintext
   *  code ONCE (the buyer must capture it). */
  static async generateOtp(userId: string, orderId: string) {
    const order = await loadOrder(orderId);
    if (order.farmer_id !== userId) throw new Error("Forbidden");
    if (!["escrow_funded", "awaiting_delivery", "shipped"].includes(order.status)) {
      throw new Error(`Order in state ${order.status} cannot receive an OTP yet`);
    }
    const sb = await getAdmin();
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_HOURS * 3600 * 1000).toISOString();

    // upsert by order_id
    const { error } = await sb.from("delivery_confirmations").upsert(
      { order_id: orderId, otp_hash: hashOtp(otp), otp_expires_at: expiresAt, confirmed_at: null, attempts: 0 },
      { onConflict: "order_id" },
    );
    if (error) throw new Error(error.message);

    await sb.from("orders").update({ status: "awaiting_delivery" }).eq("id", orderId);

    await audit({
      actorId: userId,
      actorRole: "farmer",
      action: "otp.generate",
      resourceType: "order",
      resourceId: orderId,
      metadata: { expires_at: expiresAt },
    });

    return { orderId, otp, expiresAt };
  }

  /** Step 3 — At handover the farmer enters the OTP the buyer received.
   *  Verifies the hash, opens the inspection window, and moves status to
   *  `delivered` → `inspection`. */
  static async confirmDelivery(userId: string, orderId: string, otp: string) {
    const order = await loadOrder(orderId);
    if (order.farmer_id !== userId) throw new Error("Forbidden");
    if (!["awaiting_delivery", "shipped"].includes(order.status)) {
      throw new Error(`Order in state ${order.status} cannot be confirmed`);
    }
    const sb = await getAdmin();
    const { data: conf, error } = await sb
      .from("delivery_confirmations")
      .select("otp_hash, otp_expires_at, confirmed_at, attempts")
      .eq("order_id", orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!conf) throw new Error("No delivery code generated for this order");
    if (conf.confirmed_at) throw new Error("Delivery already confirmed");
    if (new Date(conf.otp_expires_at).getTime() < Date.now()) {
      throw new Error("Delivery code has expired");
    }
    if (Number(conf.attempts ?? 0) >= 5) {
      throw new Error("Too many failed attempts. Ask the buyer for a new code.");
    }
    if (hashOtp(otp) !== conf.otp_hash) {
      const nextAttempts = Number(conf.attempts ?? 0) + 1;
      await sb
        .from("delivery_confirmations")
        .update({ attempts: nextAttempts })
        .eq("order_id", orderId);
      await audit({
        actorId: userId,
        actorRole: "farmer",
        action: "otp.verify_failure",
        resourceType: "order",
        resourceId: orderId,
        outcome: "failure",
        metadata: { attempts: nextAttempts, reason: "invalid_code" },
      });
      throw new Error("Invalid delivery code");
    }

    const now = new Date();
    const closesAt = new Date(now.getTime() + INSPECTION_WINDOW_HOURS * 3600 * 1000);
    await sb.from("delivery_confirmations")
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

    await audit({
      actorId: userId,
      actorRole: "farmer",
      action: "delivery.confirm",
      resourceType: "order",
      resourceId: orderId,
      metadata: { auto_release_at: closesAt.toISOString() },
    });

    return { orderId, status: "inspection" as const, autoReleaseAt: closesAt.toISOString() };
  }

  /** Step 4 — Buyer accepts (manual release) OR cron triggers auto-release. */
  static async release(opts: { orderId: string; actorId: string | null; auto: boolean }) {
    const order = await loadOrder(opts.orderId);
    if (!opts.auto && order.buyer_id !== opts.actorId) throw new Error("Forbidden");
    if (!["inspection", "delivered"].includes(order.status)) {
      throw new Error(`Order in state ${order.status} cannot be released`);
    }
    const held = await escrowBalanceForOrder(opts.orderId);
    if (held <= 0) throw new Error("No funds in escrow for this order");

    const sb = await getAdmin();
    await appendLedger(
      opts.orderId,
      "release",
      held,
      0,
      opts.actorId,
      opts.auto ? "auto-release after inspection window" : "buyer released funds",
    );
    await creditAvailable(order.farmer_id, held);
    await sb.from("orders").update({ status: "released" }).eq("id", opts.orderId);
    await sb.from("inspection_windows")
      .update({ released_at: new Date().toISOString() })
      .eq("order_id", opts.orderId);

    await audit({
      actorId: opts.actorId,
      actorRole: opts.auto ? "system" : "buyer",
      action: opts.auto ? "escrow.release.auto" : "escrow.release.manual",
      resourceType: "order",
      resourceId: opts.orderId,
      metadata: { released_cents: held },
    });

    return { orderId: opts.orderId, status: "released" as const, releasedCents: held };
  }


  /** Buyer raises a dispute during the inspection window. */
  static async raiseDispute(
    userId: string,
    input: { orderId: string; reason: string; evidenceUrls: string[] },
  ) {
    const order = await loadOrder(input.orderId);
    if (order.buyer_id !== userId && order.farmer_id !== userId) throw new Error("Forbidden");
    if (!["inspection", "delivered", "awaiting_delivery", "escrow_funded"].includes(order.status)) {
      throw new Error(`Order in state ${order.status} cannot be disputed`);
    }
    const sb = await getAdmin();
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
    return data;
  }

  /** Step 5 — Admin resolves a dispute. */
  static async resolveDispute(adminId: string, input: {
    disputeId: string;
    outcome: "release" | "refund" | "split";
    buyerRefundCents?: number;
    resolution: string;
  }) {
    const sb = await getAdmin();
    // Verify admin role server-side (defense in depth — the server fn also gates).
    const { data: isAdminRow } = await sb.rpc("has_role", { _user_id: adminId, _role: "admin" });
    if (!isAdminRow) throw new Error("Forbidden");

    const { data: dispute, error: dErr } = await sb
      .from("disputes")
      .select("id, order_id, state")
      .eq("id", input.disputeId)
      .maybeSingle();
    if (dErr) throw new Error(dErr.message);
    if (!dispute) throw new Error("Dispute not found");
    if (dispute.state === "resolved" || dispute.state === "rejected") {
      throw new Error("Dispute already resolved");
    }

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
      const release = held - refund;
      if (refund > 0) {
        await appendLedger(order.id, "refund", refund, held - refund, adminId, "admin: partial refund");
        await creditAvailable(order.buyer_id, refund);
      }
      if (release > 0) {
        await appendLedger(order.id, "release", release, 0, adminId, "admin: partial release");
        await creditAvailable(order.farmer_id, release);
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

  /** Cron-only: handle inspection windows that have passed without action. */
  static async runAutoRelease(): Promise<{ released: number }> {
    const sb = await getAdmin();
    const { data: windows, error } = await sb
      .from("inspection_windows")
      .select("order_id, auto_release_at, released_at")
      .is("released_at", null)
      .lte("auto_release_at", new Date().toISOString());
    if (error) throw new Error(error.message);
    let released = 0;
    for (const w of windows ?? []) {
      try {
        await this.release({ orderId: w.order_id, actorId: null, auto: true });
        released += 1;
      } catch (e) {
        console.error("auto-release failed for", w.order_id, e);
      }
    }
    return { released };
  }

  /** Cron-only: farmer ghosting — if escrow has been funded past
   *  the delivery deadline and no OTP was confirmed, refund the buyer
   *  and take a 50% penalty out of escrow before refunding. */
  static async runFarmerGhostPenalty(): Promise<{ penalized: number }> {
    const sb = await getAdmin();
    const { data: orders, error } = await sb
      .from("orders")
      .select("id, buyer_id, farmer_id, total_cents, status, delivery_deadline")
      .in("status", ["escrow_funded", "awaiting_delivery"])
      .not("delivery_deadline", "is", null)
      .lt("delivery_deadline", new Date().toISOString());
    if (error) throw new Error(error.message);

    let penalized = 0;
    for (const o of (orders ?? []) as OrderRow[]) {
      try {
        const held = await escrowBalanceForOrder(o.id);
        if (held <= 0) continue;
        const penalty = Math.round(o.total_cents * FARMER_GHOST_PENALTY_PCT);
        const penaltyCharged = Math.min(penalty, held);
        const refund = held - penaltyCharged;

        if (penaltyCharged > 0) {
          await appendLedger(o.id, "penalty", penaltyCharged, held - penaltyCharged, null, "farmer ghosting: 50% penalty to platform");
        }
        if (refund > 0) {
          await appendLedger(o.id, "refund", refund, 0, null, "farmer ghosting: refund to buyer");
          await creditAvailable(o.buyer_id, refund);
        }
        await sb.from("orders").update({ status: "penalized" }).eq("id", o.id);
        penalized += 1;
      } catch (e) {
        console.error("ghost penalty failed for", o.id, e);
      }
    }
    return { penalized };
  }
}
