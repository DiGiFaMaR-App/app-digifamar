
ALTER TABLE public.farmer_profiles
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

CREATE INDEX IF NOT EXISTS idx_farmer_profiles_state ON public.farmer_profiles (state);
CREATE INDEX IF NOT EXISTS idx_farmer_profiles_city ON public.farmer_profiles (city);
CREATE INDEX IF NOT EXISTS idx_farmer_profiles_zip ON public.farmer_profiles (zip);
CREATE INDEX IF NOT EXISTS idx_farmer_profiles_coords ON public.farmer_profiles (lat, lng);
CREATE INDEX IF NOT EXISTS idx_listings_coords ON public.listings (lat, lng);
