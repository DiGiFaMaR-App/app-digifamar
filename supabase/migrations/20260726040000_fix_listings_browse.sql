-- Fix buyer browse on rlwygbvuukrcxkytzbxf.
-- The existing "Listings read scope" SELECT policy only allowed a farmer or
-- admin to read a listing, so authenticated buyers (and anon public browse)
-- could not see any active listings. Replace it with a public-active policy.

-- Remove the orphaned E2E test data first (test order depends on test listing).
DELETE FROM public.orders
WHERE listing_id = 'dac8d45e-594c-4d0e-b217-49092ddb7d16';

DELETE FROM public.listings
WHERE id = 'dac8d45e-594c-4d0e-b217-49092ddb7d16' AND farmer_id IS NULL;

DROP POLICY IF EXISTS "Listings read scope" ON public.listings;

CREATE POLICY "Active listings are public"
  ON public.listings FOR SELECT TO anon, authenticated
  USING (
    (status = 'active' AND farmer_id IS NOT NULL)
    OR auth.uid() = farmer_id
    OR public.has_role(auth.uid(), 'admin')
  );
