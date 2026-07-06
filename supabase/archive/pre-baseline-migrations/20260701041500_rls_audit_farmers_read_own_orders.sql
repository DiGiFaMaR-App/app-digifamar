-- RLS reconciliation + audit.
--
-- Context: an external "optimized RLS" spec proposed a generic policy set for
-- profiles / farmer_profiles / listings / orders / conversations / messages /
-- order_otps. Most of it is already implemented in earlier migrations, and in
-- several places the existing rules are deliberately STRICTER than the spec
-- (e.g. farmer_profiles is owner/admin-only, not world-readable; conversations
-- may only be opened with *verified* farmers; OTP hashes are hidden from
-- clients and handled by service_role). Those stronger rules are kept as-is.
--
-- This migration applies only the genuine gap found during the audit plus a
-- defensive re-assertion of RLS on every core table. It is idempotent and safe
-- to re-run.
--
-- Notes for future readers:
--   * There is no `order_otps` table. Escrow release OTPs live in
--     `delivery_confirmations` (otp_hash / otp_expires_at, revoked from clients)
--     and `orders.release_code_hash` (column-level REVOKE from clients).
--   * conversations/messages SELECT policies are managed outside migrations and
--     are already participant-scoped; they are intentionally not touched here.

-- 1) Genuine gap: farmers could not read the orders placed on their own
--    listings. `orders` had a buyer/admin SELECT policy ("Buyers read their own
--    orders") but no farmer equivalent, so a farmer's order history only worked
--    through the service-role server client. Add a farmer SELECT policy
--    mirroring the buyer one. Column-level REVOKEs on orders still hide
--    immutable financial/identity fields from write access; SELECT of these
--    columns was already available to the buyer participant and is now
--    symmetrically available to the farmer participant.
DROP POLICY IF EXISTS "Farmers read their own orders" ON public.orders;
CREATE POLICY "Farmers read their own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = farmer_id OR public.has_role(auth.uid(), 'admin'));

-- 2) Defense in depth: guarantee RLS is enabled on every core table. Each
--    statement is a no-op where RLS is already on.
ALTER TABLE public.profiles                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_events                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_ledger                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_confirmations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_windows            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lender_profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lender_applications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_lender_recommendations ENABLE ROW LEVEL SECURITY;
