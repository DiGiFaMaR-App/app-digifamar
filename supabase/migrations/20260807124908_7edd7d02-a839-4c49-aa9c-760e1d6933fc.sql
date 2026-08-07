ALTER TABLE public.farmer_profiles
  ADD COLUMN IF NOT EXISTS lat_approx double precision
    GENERATED ALWAYS AS (round((lat)::numeric, 2)::double precision) STORED,
  ADD COLUMN IF NOT EXISTS lng_approx double precision
    GENERATED ALWAYS AS (round((lng)::numeric, 2)::double precision) STORED;

DROP VIEW IF EXISTS public.public_farms;
CREATE VIEW public.public_farms
WITH (security_invoker = true) AS
SELECT user_id, farm_name, description, city, state, zip,
       lat_approx AS lat, lng_approx AS lng,
       certifications, verification_status
FROM public.farmer_profiles
WHERE verification_status = ANY (ARRAY['verified'::text, 'pending'::text]);

GRANT SELECT ON public.public_farms TO anon, authenticated;

REVOKE SELECT (lat, lng) ON public.farmer_profiles FROM anon, authenticated;
GRANT SELECT (lat_approx, lng_approx) ON public.farmer_profiles TO anon, authenticated;