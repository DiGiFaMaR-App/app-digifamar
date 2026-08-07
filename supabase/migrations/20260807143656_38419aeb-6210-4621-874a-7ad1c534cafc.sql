CREATE TABLE public.whatsapp_click_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  path text,
  referrer text,
  source text NOT NULL DEFAULT 'fab',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.whatsapp_click_events TO anon, authenticated;
GRANT SELECT ON public.whatsapp_click_events TO authenticated;
GRANT ALL ON public.whatsapp_click_events TO service_role;

ALTER TABLE public.whatsapp_click_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a whatsapp click"
  ON public.whatsapp_click_events FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Admins can read whatsapp clicks"
  ON public.whatsapp_click_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_whatsapp_click_events_created_at ON public.whatsapp_click_events (created_at DESC);