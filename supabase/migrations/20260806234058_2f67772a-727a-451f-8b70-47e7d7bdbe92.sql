GRANT INSERT ON public.lender_applications TO anon, authenticated;
GRANT SELECT, UPDATE ON public.lender_applications TO authenticated;
GRANT ALL ON public.lender_applications TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.lender_profiles TO authenticated;
GRANT ALL ON public.lender_profiles TO service_role;

GRANT SELECT ON public.farmer_lender_recommendations TO authenticated;
GRANT ALL ON public.farmer_lender_recommendations TO service_role;