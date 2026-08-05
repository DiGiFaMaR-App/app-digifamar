// Farmer payout Edge Function — Stripe Connect (sandbox by default).
//
// Lets a farmer connect a bank account (Stripe Connect Express) and withdraw
// their wallet's available balance.
//
// Credentials come from ../_shared/stripe.ts, which branches on STRIPE_ENV
// (sandbox -> STRIPE_SANDBOX_API_KEY, live -> STRIPE_LIVE_API_KEY, with a
// legacy raw STRIPE_SECRET_KEY fallback) and keeps live mode gated behind
// MONEY_TRANSMITTER_CLEARED="true".
//
// The connected account id lives on public.profiles (stripe_account_id /
// stripe_account_status) — NOT on farmer_profiles.
//
// Actions:
//   onboard  -> create/return a Stripe Connect account + onboarding link
//   status   -> whether the farmer's connected account can receive payouts
//   payout   -> transfer the wallet's available balance to the connected account
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { adminClient, getUser } from "../_shared/supabase.ts";
import { StripeConfigError, safeStripeError, stripeRequest } from "../_shared/stripe.ts";

const sb = adminClient();

/** Map a Stripe account object onto our profiles.stripe_account_status enum. */
function accountStatus(acct: {
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  capabilities?: Record<string, string>;
  requirements?: { disabled_reason?: string | null };
}): "pending" | "active" | "restricted" {
  if (acct.capabilities?.transfers === "active" && acct.payouts_enabled) return "active";
  if (acct.requirements?.disabled_reason) return "restricted";
  return "pending";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);
  try {
    const user = await getUser(req);
    if (!user) return errorResponse("Unauthorized", 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    // Only farmers can receive payouts.
    const { data: farmerProfile } = await sb
      .from("farmer_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!farmerProfile) return errorResponse("Only farmers can receive payouts.", 403);

    const { data: profile } = await sb
      .from("profiles")
      .select("id, stripe_account_id, stripe_account_status")
      .eq("id", user.id)
      .maybeSingle();
    let accountId: string | null = profile?.stripe_account_id ?? null;

    if (action === "onboard") {
      if (!accountId) {
        const acct = await stripeRequest("/accounts", {
          idempotencyKey: `connect_account:${user.id}`,
          body: {
            type: "express",
            email: user.email ?? undefined,
            capabilities: { transfers: { requested: "true" } },
          },
        });
        accountId = acct.id as string;
        await sb
          .from("profiles")
          .update({ stripe_account_id: accountId, stripe_account_status: "pending" })
          .eq("id", user.id);
      }
      const returnUrl = String(body.returnUrl ?? "https://app.digifamar.com/dashboard/farmer");
      const link = await stripeRequest("/account_links", {
        idempotencyKey: `account_link:${user.id}:${Date.now()}`,
        body: {
          account: accountId!,
          refresh_url: returnUrl,
          return_url: returnUrl,
          type: "account_onboarding",
        },
      });
      return jsonResponse({ url: link.url, accountId });
    }

    if (action === "status") {
      if (!accountId) return jsonResponse({ connected: false, payoutsEnabled: false, status: "none" });
      const acct = await stripeRequest(`/accounts/${accountId}`);
      const status = accountStatus(acct);
      await sb.from("profiles").update({ stripe_account_status: status }).eq("id", user.id);
      return jsonResponse({
        connected: true,
        payoutsEnabled: Boolean(acct.payouts_enabled),
        detailsSubmitted: Boolean(acct.details_submitted),
        status,
      });
    }

    if (action === "payout") {
      if (!accountId) return errorResponse("Connect a bank account first (onboard).", 400);
      const acct = await stripeRequest(`/accounts/${accountId}`);
      const status = accountStatus(acct);
      await sb.from("profiles").update({ stripe_account_status: status }).eq("id", user.id);
      if (status !== "active") {
        return errorResponse("Your connected account can't receive payouts yet.", 400);
      }

      // Atomically claim the whole available balance BEFORE calling Stripe so a
      // double-click / retry can't transfer the same funds twice. The loser of a
      // concurrent race gets 0. If Stripe then fails we credit the amount back.
      const { data: claimed, error: cErr } = await sb.rpc("wallet_claim_available", {
        p_user_id: user.id,
      });
      if (cErr) throw new Error(cErr.message);
      const available = Number(claimed ?? 0);
      if (available <= 0) return errorResponse("No available balance to withdraw.", 400);

      // One key per claim attempt — reused if this request itself retries.
      const idempotencyKey = `wallet_payout:${user.id}:${crypto.randomUUID()}`;
      let transfer: { id: string };
      try {
        transfer = await stripeRequest("/transfers", {
          idempotencyKey,
          body: {
            amount: available,
            currency: "usd",
            destination: accountId!,
            description: `DiGiFaMaR wallet withdrawal for ${user.id}`,
            metadata: { user_id: user.id },
          },
        });
      } catch (e) {
        // Transfer failed — restore the claimed balance so nothing is lost.
        await sb.rpc("wallet_credit", { p_user_id: user.id, p_amount: available });
        return errorResponse(
          safeStripeError(e, `wallet payout ${user.id}`, "We couldn't send that payout. Your balance is unchanged."),
          400,
        );
      }

      await sb.from("notifications").insert({
        user_id: user.id,
        type: "payout",
        title: "Payout sent",
        body: `A payout of $${(available / 100).toFixed(2)} is on its way to your bank.`,
        data: { transfer_id: transfer.id, amount_cents: available },
      });

      return jsonResponse({ ok: true, transferId: transfer.id, amountCents: available });
    }

    return errorResponse(`Unknown action: ${action}`, 400);
  } catch (e) {
    if (e instanceof StripeConfigError) return jsonResponse({ notConfigured: true, error: e.message }, 200);
    return errorResponse(safeStripeError(e, "create-payout", "Payout request failed."), 400);
  }
});
