-- Restrict app_settings SELECT to admins only. Public-safe values are exposed
-- through dedicated server functions that whitelist allowed keys.
DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Public can read app settings" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_public_select" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings select" ON public.app_settings;

-- Drop any remaining SELECT policies on app_settings to be safe
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'app_settings' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.app_settings', pol.policyname);
  END LOOP;
END $$;

REVOKE SELECT ON public.app_settings FROM anon;

CREATE POLICY "Admins can read app settings"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));