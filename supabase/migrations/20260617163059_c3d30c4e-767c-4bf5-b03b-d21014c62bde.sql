
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Public-readable settings; writes happen only via service_role server fns.
CREATE POLICY "App settings are publicly readable"
  ON public.app_settings
  FOR SELECT
  USING (true);

-- Seed the current default Google Maps browser key for app.digifamar.com.
INSERT INTO public.app_settings (key, value)
VALUES ('gmaps_browser_key', 'AIzaSyAsS-uzitVmw3ttfqL08peKCO6OuO-8gi4')
ON CONFLICT (key) DO NOTHING;
