DiGiFaMaR is a large platform spec (40+ pages, escrow payments, Stripe Connect, SMS, AI vision, real Google Maps, admin tools). Building all of it in one shot would produce shallow, half-broken screens. I'll deliver it in clear phases — this plan covers **Phase 1: the public, design-defining surface** — and outlines later phases so we agree on sequencing.

## Phase 1 — Public marketing site + design system + browse shell (this build)

Sets the brand, design system, and the screens every visitor sees before signing up. Uses mock data; no backend yet.

### Design system (`src/styles.css`)
- Forest green primary `#2D6A4F`, harvest orange secondary `#F4A261`, off-white bg `#FAFAFA`, dark mode `#1A1A2E`, all defined as `oklch` tokens.
- Semantic tokens for badges (verified-green, delivery-blue, organic-light-green, top-seller-gold, new-orange).
- Inter font (Google Fonts), rounded-xl cards, soft shadows, green focus rings, subtle hover lift.
- Reusable `Header` (sticky, logo + nav + auth CTAs), `Footer` (full link columns + WhatsApp + compliance badges), floating WhatsApp button on every page, mobile bottom nav.

### Routes built
- `/` Landing: hero with generated farm landscape, trust badges, How It Works (3 steps), stats bar, 10-category grid, 6 featured farms, featured products carousel, Why DiGiFaMaR (buyer + farmer columns), testimonials, "Farms Across America" map placeholder section, app download banner, footer.
- `/browse` Browse shell: sidebar filters (location, distance, delivery speed, categories, price, certifications, rating, verified toggle), top bar (search, grid/list/map toggle, sort, count), product card grid with mock listings. Map view = styled placeholder.
- `/product/$id` Product detail: gallery, AI freshness badge, price, delivery options, add-to-cart, farm info card, tabbed content (description/farm story/nutrition/reviews/shipping), similar products.
- `/farm/$id` Farm profile: hero banner, verified + rating, story, certifications, gallery, products grid, farmer bio, reviews, map placeholder.
- `/signup` Role selection (buyer card vs farmer card).
- `/signup/buyer`, `/signup/farmer`, `/signin` — full form UI, client-side validation only.
- `/pricing` Free / Pro / Elite tiers.
- `/how-it-works`, `/about`, `/buyer-protection`, `/lending`, `/contact` — content pages.
- Each route gets its own `head()` with unique title + description + og tags.

### Generated imagery
~6 hero/landscape/category images via the image tool, stored in `src/assets/`. Farm/product cards use the same handful, varied — not stock placeholders.

### Out of scope for Phase 1 (intentional, see phases below)
- No real auth, no database, no Stripe, no SMS, no real Google Maps key, no AI calls, no real-time chat, no admin tools, no farmer dashboard internals, no order tracking, no escrow logic.
- Cart/checkout/order screens deferred to Phase 2.
- Farmer dashboard, listings wizard, earnings, analytics deferred to Phase 3.

## Proposed later phases (not built yet — confirm sequencing before we start each)

- **Phase 2 — Auth + Cart + Orders:** Enable Lovable Cloud, real email/password + Google auth, `profiles` + `user_roles` (buyer/farmer/admin) tables, cart state, `/cart` + `/checkout` UI, `/order/confirmed`, `/orders/$id` tracking screen, buyer `/dashboard`. Stripe Payment Element for checkout (test mode). Escrow modeled as order status (held → released) without true Stripe Connect yet.
- **Phase 3 — Farmer side:** Farmer signup verification flow, `/farmer/dashboard` with stats + revenue chart (Recharts), `/farmer/listings` + 5-step add-listing wizard, `/farmer/orders` with "mark shipped" + 6-digit code entry, `/farmer/earnings`, `/farmer/profile`, `/farmer/analytics`.
- **Phase 4 — Real integrations:** Stripe Connect for farmer payouts + escrow capture/release, Twilio for SMS 6-digit codes, Google Maps Platform connector for real map/places autocomplete/geocoding, Lovable AI Gateway for freshness analyzer + smart search + auto-descriptions, in-app messaging (Supabase Realtime).
- **Phase 5 — Admin + Trust & Safety:** `/admin` verification queue, dispute center, reporting tools, USDA compliance pages, refund automation.

## Technical notes

- Stack stays TanStack Start + Tailwind v4 + shadcn. File-based routes under `src/routes/` using flat dot-notation (`farm.$id.tsx`, `signup.buyer.tsx`, etc.).
- All colors via semantic tokens — no raw hex in components.
- Mobile bottom nav appears below `md` breakpoint; sticky header above.
- WhatsApp FAB is a shared component included in `__root.tsx`.
- Mock data lives in `src/lib/mock-data.ts` so Phase 2 can swap to server functions cleanly.

## What I need from you

1. **Confirm Phase 1 scope** above (or tell me to shrink/expand it).
2. **Confirm the phased rollout** — I'll stop after Phase 1 and wait for your go-ahead before each next phase, so we can review the design and adjust before piling on backend complexity.

If you'd rather I jump straight into a specific later phase (e.g. "skip marketing polish, build farmer dashboard first"), say so and I'll re-plan.