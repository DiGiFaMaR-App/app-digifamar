GRANT SELECT (key, value, updated_at) ON public.app_settings TO anon;

DROP POLICY IF EXISTS "Public can read Google Maps browser key" ON public.app_settings;
CREATE POLICY "Public can read Google Maps browser key"
ON public.app_settings
FOR SELECT
TO anon
USING (key = 'gmaps_browser_key');