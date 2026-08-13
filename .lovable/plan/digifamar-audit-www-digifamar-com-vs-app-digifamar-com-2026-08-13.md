# DiGiFaMaR Audit: www.digifamar.com vs app.digifamar.com

Read-only audit of this canonical project. No code changed. Findings below are backed by direct reads of the repo, the live marketing site, and the production database.

## 1. What is genuinely production-wired

| Capability | Where it lives | State |
|---|---|---|
| Auth, roles (admin/farmer/buyer/lender), Google sign-in | `src/routes/auth.tsx`, `user_roles`, `has_role` | Working |
| Farmer listing publish + photos | `src/routes/dashboard.farmer.tsx`, `src/lib/farmer/listings.ts`, `listings`, `product-images` bucket | Working, verified end to end |
| Live-first marketplace + product pages | `src/lib/catalog/use-catalog.ts`, `/market`, `/product/$id`, `/farm/$id` | Working, falls back to labelled demo data |
| Location discovery, maps, OSM fallback | `/near-me`, `/browse`, `BrowseMap.tsx`, `OsmMap.tsx`, `public_farms` | Working |
| Orders + DB-enforced pricing (10% platform, 3.25% escrow) | `orders`, `validate_order_insert()`, `src/lib/cart/fees.ts` | Working |
| Escrow state machine, ledger, OTP release code, inspection window, auto-release, ghost penalty, disputes | `src/lib/escrow-v2/service.server.ts`, `escrow_ledger`, `delivery_confirmations`, `inspection_windows`, `disputes`, `/api/public/cron/auto-release` | Working, append-only, audited |
| Stripe PaymentIntent + Connect transfer + webhooks | `supabase/functions/escrow`, `stripe-webhook`, `create-payout` | Wired, **sandbox credentials only** |
| Farmer KYC upload/review/resubmit | `/farmer/verification`, `farmer_kyc_documents`, `src/lib/admin/kyc.functions.ts` | Working |
| Chat with contact-info guard, notifications, delivery tracking | `conversations`, `messages`, `notifications`, `order_tracking` | Working |
| Admin ops (orders, farmers, listings, audit, KYC, lenders) | `src/routes/admin.*`, `lenders/admin.tsx` | Working |
| Android/Capacitor incl. signed AAB | `android/`, `.github/workflows/build-apk.yml` (`bundleRelease`) | Working |

## 2. What is still demo/seed-only

Production database counts, queried live: **0 listings, 0 farmer profiles, 0 orders, 0 ledger entries, 0 disputes, 0 reviews, 0 conversations, 0 lender leads, 8 auth users (1 farmer role, 7 buyer roles).**

Consequences that follow from that, not from code defects:
- Every marketplace surface renders the bundled sample catalog (`src/lib/mock-data.ts`) with the `DemoNotice` label. Nothing real is for sale yet.
- Escrow/ledger/dispute machinery has never run on a real transaction.
- Lender trade scores (`src/lib/lenders/recommendations.ts`) have no sales history to score.
- Stripe runs on `STRIPE_SANDBOX_API_KEY`; no live key is configured, so no real money can move today.
- SMS (Vonage) and transactional email sender domain are **not configured**, so the 6-digit release code falls back to on-screen display and status emails silently no-op.

## 3. Public site promises the app does not support

| Public-site claim | Reality in this project | Recommended action |
|---|---|---|
| "Agent — Connect & earn" role in the join flow | No agent role exists (`app_role` = admin/farmer/buyer/lender); no agent signup, attribution or commission anywhere | **Change the site** (remove or mark "coming soon") — do not fabricate a commission role |
| "10,000+ Verified Local Farmers", "98% 24-hour delivery", "Join thousands of users", testimonials from named farmers | 0 farmer profiles, 0 orders in production | **Change the site.** These are unverifiable activity claims; replace with pre-launch/early-access language |
| "Protected by Escrow.com" / "Powered by Escrow.com" | Escrow is DiGiFaMaR-operated on Stripe (PaymentIntent hold + Connect transfer), not Escrow.com | **Change both**: site copy and the stale `Escrow.com` strings still in `src/routes/index.tsx`, `SplashScreen.tsx`, `cart.tsx`, `fees.ts` comment, `assistant/engine.ts` |
| "Farmers keep 80-92%" / "Retain 80-92% of sale price" | Authoritative model: 10% platform fee, farmer receives 90% before separate escrow/processing/withdrawal charges | **Change the site** to the 10%/90% model |
| "Funds released within 24 hours of delivery confirmation" | Buyer confirmation opens a 48-hour inspection window (`INSPECTION_WINDOW_HOURS = 48`); buyer can accept immediately, otherwise auto-release at 48h | **Change the site** to describe instant release on buyer acceptance, otherwise 48h auto-release. Do not shorten the window in code to match marketing |
| "72-hour refund trigger, full refund within 24 hours" | There is a 72h OTP TTL and a farmer-ghost penalty path, but no automatic 72h refund SLA or 24h refund guarantee | **Change the site** to describe the dispute-based process actually implemented |
| "Real-time market data / AI-powered pricing insights" | No market price feed exists | **Change the site** or scope it as roadmap |
| Retailer/B2B purchasing | No bulk pricing, quote, PO or wholesale account concept in `orders`/`listings` | Site should present B2B as onboarding-assisted, not self-serve, until built |
| Price negotiation in chat | Chat is free-text only; no structured offer/counter-offer tied to an order | Either scope as a later feature or soften the site claim |

## 4. What the app supports but the site never explains

- Farmer KYC/verification workflow with document review and status changes.
- Dispute workflow with evidence upload and escrow freeze (`DisputePanel.tsx`, `disputes`, `dispute_events`).
- Farmer-ghosting protection: missed delivery deadline triggers refund with a 50% penalty out of escrow.
- Order delivery timeline (placed → packed → shipped → delivered) with buyer notifications.
- Saved farms, order audit log (`/orders/$id/audit`), admin audit trail.
- VIP verification badge subscription ($20/month) — monetisation the site never mentions.
- Lender portal: institutional applications, trade-score recommendations, farmer loan-interest queue (all informational, no automated credit decision).
- Delivery fee model (pickup / standard / express) and the separate 3.25% escrow fee.

## 5. Inconsistencies to reconcile

1. **Fee language**: app is uniformly 10% (`PLATFORM_FEE_RATE = 0.1`, DB trigger, `/pricing`); site still says 80-92%.
2. **Escrow provider**: Stripe in reality; Escrow.com in both site copy and leftover app strings.
3. **Release-code direction**: site says the code is texted to the buyer and the farmer enters it — that matches the implementation, but SMS is unconfigured, so today the code is shown on the farmer's screen. Either configure SMS or state the fallback.
4. **Delivery timing**: 24h/48h promises are marketing targets; the app computes delivery fee/ETA by method and distance, with no carrier integration or guarantee.
5. **Role vocabulary**: site (farmer/buyer/agent/investor) vs app (farmer/buyer/lender/admin).
6. **Tagline/positioning**: keep "Where We Prioritize Our Customers" (site) and "America's Farmers. Direct to Market. No Middlemen." (app) as-is; both are already consistent.

## 6. Smallest safe sequence to go from demo to real (proposed, no code yet)

Each step reuses existing files/tables — no new architecture, no duplicate flows.

1. **Truth pass on copy** — remove residual `Escrow.com` strings in `index.tsx`, `SplashScreen.tsx`, `cart.tsx`, `assistant/engine.ts`, `fees.ts`; align delivery/refund wording in `how-it-works.tsx` and `buyer-protection.tsx` with the 48h inspection window and dispute-based refunds. Hand the site owner the matching list of www changes.
2. **Enable the real notification channels** — configure Vonage SMS + a verified email sender domain so the 6-digit code and order emails actually deliver (`src/lib/notifications/*`). No code redesign needed, only secrets plus a fallback banner when unconfigured.
3. **Go-live payments gate** — add a single read-only readiness surface in the existing admin area reporting Stripe environment, webhook secret, Connect payout status, SMS/email status, and cron secret, so nobody flips to live blind. Switch `STRIPE_ENV` to live only after that reads green.
4. **Farmer supply onboarding** — funnel real farmers through the existing `/signup/farmer` → KYC → listing publish path; keep the demo catalog only as the empty-state fallback that already labels itself.
5. **First real transaction rehearsal** — one live order end to end (fund → OTP → confirm → inspection → release → payout) with ledger and audit review before any public launch claim.
6. **B2B/retailer and agent decisions** — treat both as product decisions: either scope them into the existing `orders`/`user_roles` model in a later plan, or remove them from the public site. Do not stub them in the app to match marketing.

## Technical notes

- Verified live: DB row counts above; `PLATFORM_FEE_RATE = 0.1` and `validate_order_insert()` both at 10% + 3.25%; `INSPECTION_WINDOW_HOURS = 48`, `OTP_TTL_HOURS = 72`, `FARMER_GHOST_PENALTY_PCT` refund path; `bundleRelease` AAB step present in CI; Stripe resolves sandbox credentials via `supabase/functions/_shared/stripe.ts`.
- No legacy 8%/92% fee logic remains in code; the only 80-92% claims live on the public website.
- Nothing in this audit changes financial state-machine behavior.
