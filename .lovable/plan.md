# DiGiFaMaR — Gap-fill build plan

Your app already ships most of these phases. I'll audit each one against what exists and only build what's missing. I'll use sensible defaults for the open questions; tell me to change any of them.

## Defaults I'll use (say "change X" to override)

- **OTP delivery**: in-app + email (no Twilio cost). Real SMS can be added later by connecting Twilio.
- **Payments**: keep the existing Escrow.com integration (already wired, simulates until `ESCROW_COM_API_KEY` is set). PayPal/Bank Transfer shown as "coming soon" — Lovable's built-in payments cover card only.
- **Farmer onboarding submit**: save to `farmer_profiles` AND email summary to `support@digifamar.com` (I'll set up the email domain).
- **Watermark removal**: requires Pro plan; I'll surface the publish-settings toggle.

## Phase-by-phase audit & gaps

### Phase 1 — Foundation & Navigation
- ✅ Splash (`SplashScreen.tsx`), logo, auth/role select, bottom nav (`MobileBottomNav`), brand colors in `styles.css`.
- ⚠️ Add **Farm Hacks** tab to bottom nav (currently missing).
- ⚠️ Verify tagline matches exactly: "America's Farmers. Direct to Market. No Middlemen."

### Phase 2 — Farmer Onboarding
- ✅ `signup.farmer.tsx` exists.
- 🔨 Rebuild as a true **5-step wizard** (Personal → Farm → Products → Delivery zones → Review).
- 🔨 On submit: insert into `farmer_profiles`, then call a server fn that emails `support@digifamar.com` via Lovable Emails.

### Phase 3 — Marketplace & Chat
- ✅ Browse/market with filters, distance via geolocation, chat threads, listing → chat flow.
- ⚠️ Add explicit **"Accept Price"** action in chat that transitions the negotiation into a checkout intent (currently chat is freeform).

### Phase 4 — Distance, Escrow & Payment
- ✅ Escrow.com checkout, server-side fee compute, RLS-locked orders, release-code hash in DB.
- 🔨 Add **distance-based delivery fee** to `computeFees` (Google Maps Distance Matrix via gateway, farm coords stay server-side per security memory).
- 🔨 Payment method picker UI (Card active, PayPal/Bank greyed "coming soon").
- 🔨 On payment success: generate 6-digit OTP server-side, hash with bcrypt → `release_code_hash`, email plaintext to buyer, post system message "Payment held in Escrow" into the chat thread.

### Phase 5 — Delivery & Live Tracking
- ✅ `LiveTrackingMap.tsx` exists, Google Maps connector active.
- 🔨 Farmer **"Start Delivery"** button on order detail → status transition `accepted` → `in_transit`, begins broadcasting GPS (Supabase Realtime channel keyed by order id; ephemeral, not persisted).
- 🔨 Embed live map in the order's chat thread for the buyer.
- ✅ OTP release endpoint already exists (`/api/orders/$id/release`).

### Phase 6 — Post-Release
- ✅ Fee split already computed (5% platform + 2.5% escrow). Per spec you want **10% platform** — I'll update `computeFees` constants.
- 🔨 After OTP release: redirect to **Feedback page** (5-star + review) → insert into existing `reviews` table.

### Phase 7 — Additional Features
- ✅ Lending route exists (`/lending`, `/lenders/*`).
- 🔨 Update lending policy copy: 30-tx threshold, continuous-trading clause, "facilitator only" disclaimer.
- 🔨 **Admin dashboard**: new `_authenticated/_admin/*` subtree gated by `has_role(uid, 'admin')`, shows transactions / disputes / ratings tables.
- 🔨 **Farm Hacks** blog: new `/hacks` route, markdown posts from a new `farm_hacks` table (admin-authored, public read).

### Final
- 🔨 Toggle Lovable badge off (Pro feature) via publish settings.
- Smooth-scroll, page transitions, loading skeletons already present.

## Order of execution

I'll ship in this order over multiple turns; each turn = one phase you can review:

1. **Phase 1 polish + Phase 7 Farm Hacks tab** (smallest, validates nav)
2. **Phase 2 onboarding wizard + email**
3. **Phase 4 fee update (10%), distance fee, OTP issuance, payment picker UI**
4. **Phase 3 "Accept Price" → checkout handoff**
5. **Phase 5 live tracking via Realtime + farmer Start Delivery**
6. **Phase 6 feedback page after release**
7. **Phase 7 admin dashboard + Farm Hacks blog + lending copy + badge toggle**

## Technical notes

- All payments / fee math stays server-side (existing `enforce_orders_update_restrictions` trigger + revoked column UPDATEs keep buyers/farmers from tampering).
- GPS broadcasting uses Supabase Realtime **broadcast** channel (not persisted) so we don't store precise farmer coords — aligns with the resolved `listings_precise_coordinates_public` finding.
- New `farm_hacks` table gets `SELECT TO anon`, write restricted to admin role.
- Reviews already RLS-scoped; just need UI.

---

Approve to start with **Phase 1 + Farm Hacks tab**, or tell me to reorder / change defaults.