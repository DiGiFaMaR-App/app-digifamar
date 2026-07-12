// Farmer payout Edge Function — Stripe Connect (TEST MODE by default).
//
// Lets a farmer connect a bank account (Stripe Connect Express) and withdraw
// their wallet's available balance. Reads STRIPE_SECRET_KEY from the Supabase
// secret store. Uses the Stripe REST API directly (no SDK).
//
// SAFETY GATE — money-transmitter compliance:
//   A LIVE Stripe key (sk_live_...) is REJECTED unless the operator explicitly
//   sets MONEY_TRANSMITTER_CLEARED="true" in the function secrets. Until then
//   only test-mode keys work, so no real customer funds can move.
//
// Actions:
//   onboard  -> create/return a Stripe Connect account + onboarding link
//   status   -> whether the farmer's connected account can receive payouts
//   payout   -> transfer the wallet's available balance to the connected account
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { adminClient, getUser } from "../_shared/supabase.ts";

const sb = adminClient();
const STRIPE_API = "https://api.stripe.com/v1";

function stripeKey(): { key: string } | { error: Response } {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) return { error: jsonResponse({ notConfigured: true }) };
  const isLive = key.startsWith("sk_live_");
  const cleared = Deno.env.get("MONEY_TRANSMITTER_CLEARED") === "true";
  if (isLive && !cleared) {
    return {
      error: errorResponse(
        "Live Stripe key detected but money-transmitter licensing is not cleared. " +
          "Set MONEY_TRANSMITTER_CLEARED=true to enable live payouts.",
        403,
      ),
    };
  }
  return { key };
}

async function stripe(path: string, key: string, form?: Record<string, string>) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: form ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form ? new URLSearchParams(form).toString() : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? `Stripe HTTP ${res.status}`);
  return json;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);
  try {
    const user = await getUser(req);
    if (!user) return errorResponse("Unauthorized", 401);
    const gate = stripeKey();
    if ("error" in gate) return gate.error;
    const key = gate.key;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    const { data: farmer } = await sb
      .from("farmer_profiles")
      .select("user_id, stripe_account_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!farmer) return errorResponse("Only farmers can receive payouts.", 403);

    let accountId: string | null = farmer.stripe_account_id ?? null;

    if (action === "onboard") {
      if (!accountId) {
        const acct = await stripe("/accounts", key, {
          type: "express",
          "capabilities[transfers][requested]": "true",
          email: user.email ?? "",
        });
        accountId = acct.id;
        await sb.from("farmer_profiles").update({ stripe_account_id: accountId }).eq("user_id", user.id);
      }
      const returnUrl = String(body.returnUrl ?? "https://app.digifamar.com/dashboard/farmer");
      const link = await stripe("/account_links", key, {
        account: accountId!,
        refresh_url: returnUrl,
        return_url: returnUrl,
        type: "account_onboarding",
      });
      return jsonResponse({ url: link.url, accountId });
    }

    if (action === "status") {
      if (!accountId) return jsonResponse({ connected: false, payoutsEnabled: false });
      const acct = await stripe(`/accounts/${accountId}`, key);
      return jsonResponse({
        connected: true,
        payoutsEnabled: Boolean(acct.payouts_enabled),
        detailsSubmitted: Boolean(acct.details_submitted),
      });
    }

    if (action === "payout") {
      if (!accountId) return errorResponse("Connect a bank account first (onboard).", 400);
      const acct = await stripe(`/accounts/${accountId}`, key);
      if (!acct.payouts_enabled) return errorResponse("Your connected account can't receive payouts yet.", 400);

      const { data: wallet } = await sb
        .from("wallets")
        .select("available_balance_cents")
        .eq("user_id", user.id)
        .maybeSingle();
      const available = Number(wallet?.available_balance_cents ?? 0);
      if (available <= 0) return errorResponse("No available balance to withdraw.", 400);

      // Transfer from platform balance to the farmer's connected account.
      const transfer = await stripe("/transfers", key, {
        amount: String(available),
        currency: "usd",
        destination: accountId!,
        description: `DiGiFaMaR wallet withdrawal for ${user.id}`,
      });

      // Debit the wallet only after the transfer succeeds.
      const { error: uerr } = await sb
        .from("wallets")
        .update({ available_balance_cents: 0 })
        .eq("user_id", user.id);
      if (uerr) throw new Error(uerr.message);

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
    return errorResponse((e as Error)?.message ?? "payout error", 400);
  }
});
