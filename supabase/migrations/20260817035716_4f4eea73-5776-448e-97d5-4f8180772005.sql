-- 1. listings: hide precise coordinates from public/clients, expose ~1km approx
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS lat_approx double precision GENERATED ALWAYS AS (round(lat::numeric, 2)::double precision) STORED,
  ADD COLUMN IF NOT EXISTS lng_approx double precision GENERATED ALWAYS AS (round(lng::numeric, 2)::double precision) STORED;

REVOKE SELECT ON public.listings FROM anon, authenticated;
GRANT SELECT (id, farmer_id, title, slug, description, category, price_cents, unit, qty_available, images, status, created_at, updated_at, lat_approx, lng_approx)
  ON public.listings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT ALL ON public.listings TO service_role;

-- 2. orders: restrict which statuses buyers/farmers may write (transitions already enforced by triggers)
DROP POLICY IF EXISTS "Buyers update their orders" ON public.orders;
CREATE POLICY "Buyers update their orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id AND status IN ('pending','paid','in_escrow','shipped','delivered','cancelled','disputed'));

DROP POLICY IF EXISTS "Farmers update their orders" ON public.orders;
CREATE POLICY "Farmers update their orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (auth.uid() = farmer_id)
  WITH CHECK (auth.uid() = farmer_id AND status IN ('pending','paid','in_escrow','shipped','cancelled','disputed'));

-- 3. OTP tables are server-only
REVOKE ALL ON public.phone_otps FROM anon, authenticated;
REVOKE ALL ON public.otp_send_events FROM anon, authenticated;
GRANT ALL ON public.phone_otps TO service_role;
GRANT ALL ON public.otp_send_events TO service_role;