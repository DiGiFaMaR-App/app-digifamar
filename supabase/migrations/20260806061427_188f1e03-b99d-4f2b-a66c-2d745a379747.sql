REVOKE ALL ON public.farmer_profiles_private FROM anon;
REVOKE ALL ON public.farmer_profiles_private FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.farmer_profiles_private TO authenticated;
GRANT ALL ON public.farmer_profiles_private TO service_role;