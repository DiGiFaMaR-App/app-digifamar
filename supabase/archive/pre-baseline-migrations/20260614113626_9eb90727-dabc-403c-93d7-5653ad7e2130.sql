
-- 1) Hide listings.lat / listings.lng from anon and authenticated.
-- Server code uses service_role and is unaffected.
REVOKE SELECT (lat, lng) ON public.listings FROM anon, authenticated;

-- 2) Restrict delivery_confirmations: do not expose otp_hash / otp_expires_at
-- to participants. Server (service_role) reads/writes these.
DROP POLICY IF EXISTS "Participants view delivery confirmation" ON public.delivery_confirmations;

CREATE POLICY "Participants view delivery confirmation (safe cols)"
ON public.delivery_confirmations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = delivery_confirmations.order_id
      AND (o.buyer_id = auth.uid() OR o.farmer_id = auth.uid())
  )
);

REVOKE SELECT (otp_hash, otp_expires_at) ON public.delivery_confirmations FROM anon, authenticated;

-- 3) Tighten conversations INSERT: creator must be the buyer, farmer must be
-- a real farmer (has a farmer_profiles row).
DROP POLICY IF EXISTS "Participants create conversations" ON public.conversations;

CREATE POLICY "Buyers create conversations with real farmers"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = buyer_id
  AND EXISTS (SELECT 1 FROM public.farmer_profiles fp WHERE fp.user_id = farmer_id)
);
