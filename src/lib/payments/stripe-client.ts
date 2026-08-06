/**
 * Browser-side Stripe.js loader.
 *
 * The publishable key is the project's existing payments client token
 * (`VITE_PAYMENTS_CLIENT_TOKEN`, a `pk_...` key) — no new env var is
 * introduced. It is publishable by design and safe in the client bundle.
 *
 * `loadStripe` is memoised so the Stripe.js script is only fetched once, and
 * only when a payment surface is actually rendered.
 */
import { loadStripe, type Stripe } from "@stripe/stripe-js";

export const STRIPE_PUBLISHABLE_KEY = (import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] ?? "").trim();

export const isStripeConfigured = STRIPE_PUBLISHABLE_KEY.startsWith("pk_");

let cached: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!isStripeConfigured) return Promise.resolve(null);
  if (!cached) cached = loadStripe(STRIPE_PUBLISHABLE_KEY);
  return cached;
}
