REVOKE ALL ON FUNCTION public.enforce_listing_plan_limit() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_listing_plan_limit() TO service_role;