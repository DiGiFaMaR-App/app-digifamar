REVOKE SELECT ON public.farmer_profiles FROM anon, authenticated;

GRANT SELECT (
  user_id, farm_name, description, city, state, zip, acres, years_farming,
  products, certifications, verification_status, farm_type,
  lat_approx, lng_approx, created_at, updated_at
) ON public.farmer_profiles TO anon, authenticated;