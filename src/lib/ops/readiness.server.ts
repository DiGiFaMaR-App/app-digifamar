/**
 * Go-live readiness checks (server-only).
 *
 * Read-only inspection of the credentials and switches that decide whether
 * DiGiFaMaR can run a *real* transaction end to end: Stripe environment and
 * webhook secret, SMS + email delivery for the 6-digit release code and order
 * updates, the auto-release cron secret, and whether any live marketplace
 * supply exists yet. Nothing here mutates state or moves money.
 */

export type ReadinessStatus = "ready" | "warning" | "blocked";

export type ReadinessCheck = {
  id: string;
  label: string;
  status: ReadinessStatus;
  detail: string;
};

export type ReadinessReport = {
  checkedAt: string;
  stripeEnv: "sandbox" | "live";
  overall: ReadinessStatus;
  checks: ReadinessCheck[];
};

const has = (name: string) => Boolean(process.env[name]?.trim());

function worst(checks: ReadinessCheck[]): ReadinessStatus {
  if (checks.some((c) => c.status === "blocked")) return "blocked";
  if (checks.some((c) => c.status === "warning")) return "warning";
  return "ready";
}

/** Config-only checks — no network calls, no secret values ever returned. */
export function collectConfigChecks(): { stripeEnv: "sandbox" | "live"; checks: ReadinessCheck[] } {
  const stripeEnv = process.env["STRIPE_ENV"]?.trim() === "live" ? "live" : "sandbox";
  const liveKey = has("STRIPE_LIVE_API_KEY");
  const sandboxKey = has("STRIPE_SANDBOX_API_KEY") || has("STRIPE_SECRET_KEY");
  const webhookSecret =
    stripeEnv === "live" ? has("PAYMENTS_LIVE_WEBHOOK_SECRET") : has("PAYMENTS_SANDBOX_WEBHOOK_SECRET");

  const checks: ReadinessCheck[] = [
    {
      id: "stripe-env",
      label: "Payments environment",
      status: stripeEnv === "live" ? "ready" : "warning",
      detail:
        stripeEnv === "live"
          ? "Running in live mode — real charges and payouts are possible."
          : "Running in test mode. No real money can move until the live environment is switched on.",
    },
    {
      id: "stripe-key",
      label: "Payments credentials",
      status: stripeEnv === "live" ? (liveKey ? "ready" : "blocked") : sandboxKey ? "ready" : "blocked",
      detail:
        stripeEnv === "live"
          ? liveKey
            ? "Live payment credentials are configured."
            : "Live payment credentials are missing — checkout would fail in live mode."
          : sandboxKey
            ? "Test payment credentials are configured."
            : "Test payment credentials are missing — checkout cannot run.",
    },
    {
      id: "stripe-webhook",
      label: "Payment webhook secret",
      status: webhookSecret ? "ready" : stripeEnv === "live" ? "blocked" : "warning",
      detail: webhookSecret
        ? `Webhook signing secret present for the ${stripeEnv === "live" ? "live" : "test"} environment.`
        : "No webhook signing secret — payment and subscription status updates will not be recorded.",
    },
    {
      id: "sms",
      label: "SMS delivery (6-digit release code)",
      status:
        has("VONAGE_API_KEY") && has("VONAGE_API_SECRET") && has("VONAGE_FROM") ? "ready" : "warning",
      detail:
        has("VONAGE_API_KEY") && has("VONAGE_API_SECRET") && has("VONAGE_FROM")
          ? "Release codes and order updates can be texted to buyers."
          : "SMS is not configured. Release codes fall back to on-screen display for the buyer.",
    },
    {
      id: "email",
      label: "Transactional email",
      status: has("LOVABLE_API_KEY") && has("EMAIL_SENDER_DOMAIN") ? "ready" : "warning",
      detail:
        has("LOVABLE_API_KEY") && has("EMAIL_SENDER_DOMAIN")
          ? "Order status emails can be sent from a verified sender domain."
          : "No verified sender domain — order status emails are skipped silently.",
    },
    {
      id: "cron",
      label: "Auto-release cron secret",
      status: has("CRON_SECRET") ? "ready" : "blocked",
      detail: has("CRON_SECRET")
        ? "Scheduled escrow auto-release and ghosting penalties can run."
        : "CRON_SECRET missing — the 48-hour auto-release job cannot authenticate.",
    },
    {
      id: "maps",
      label: "Maps / geocoding key",
      status: has("GOOGLE_API_KEY") || has("GOOGLE_MAPS_API_KEY") ? "ready" : "warning",
      detail:
        has("GOOGLE_API_KEY") || has("GOOGLE_MAPS_API_KEY")
          ? "A Google Maps key is available; OpenStreetMap remains the automatic fallback."
          : "No Google Maps key — the app falls back to OpenStreetMap everywhere.",
    },
  ];

  return { stripeEnv, checks };
}

/** Marketplace-supply checks, using the caller's authenticated client. */
export function supplyChecks(counts: {
  activeListings: number;
  verifiedFarmers: number;
  payoutReadyFarmers: number;
}): ReadinessCheck[] {
  return [
    {
      id: "supply",
      label: "Live listings",
      status: counts.activeListings > 0 ? "ready" : "blocked",
      detail:
        counts.activeListings > 0
          ? `${counts.activeListings} active listing(s) published by real farmers.`
          : "No real listings yet — the marketplace still renders the labelled sample catalog.",
    },
    {
      id: "verified-farmers",
      label: "Verified farmers",
      status: counts.verifiedFarmers > 0 ? "ready" : "warning",
      detail:
        counts.verifiedFarmers > 0
          ? `${counts.verifiedFarmers} farmer(s) have passed KYC review.`
          : "No farmer has completed KYC verification yet.",
    },
    {
      id: "payout-ready",
      label: "Payout-ready farmers",
      status: counts.payoutReadyFarmers > 0 ? "ready" : "blocked",
      detail:
        counts.payoutReadyFarmers > 0
          ? `${counts.payoutReadyFarmers} farmer account(s) can receive escrow payouts.`
          : "No farmer has an active payout account — escrow could be funded but never released.",
    },
  ];
}

export function buildReport(
  stripeEnv: "sandbox" | "live",
  checks: ReadinessCheck[],
): ReadinessReport {
  return {
    checkedAt: new Date().toISOString(),
    stripeEnv,
    overall: worst(checks),
    checks,
  };
}
