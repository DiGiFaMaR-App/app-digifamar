-- Self-contained app support:
--   1) public_farms view — safe farm columns for client-side browse/near-me
--      (no street address), readable by anon/authenticated.
--   2) notifications table + RLS + realtime for in-app notifications.
--   3) order-placed trigger -> notifies the farmer (SECURITY DEFINER so the
--      buyer's direct insert can create the farmer's notification).
--   4) farmer_profiles.stripe_account_id for Stripe Connect payouts.

-- ── 1) public_farms view ──────────────────────────────────────────
CREATE OR REPLACE VIEW public.public_farms AS
SELECT
  user_id,
  farm_name,
  description,
  city,
  state,
  zip,
  products,
  certifications,
  verification_status,
  lat,
  lng
FROM public.farmer_profiles;

GRANT SELECT ON public.public_farms TO anon, authenticated;

-- ── 4) Stripe Connect account id ──────────────────────────────────
ALTER TABLE public.farmer_profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id text;

-- ── 2) notifications ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_created_idx
  ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their own notifications" ON public.notifications;
CREATE POLICY "Users read their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update their own notifications" ON public.notifications;
CREATE POLICY "Users update their own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete their own notifications" ON public.notifications;
CREATE POLICY "Users delete their own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins read all notifications" ON public.notifications;
CREATE POLICY "Admins read all notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- No INSERT policy for clients: rows are created by SECURITY DEFINER triggers
-- and by Edge Functions using the service role.

-- Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- ── 3) order-placed notification trigger ──────────────────────────
CREATE OR REPLACE FUNCTION public.notify_farmer_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    NEW.farmer_id,
    'order',
    'New order received',
    'A buyer placed an order. Open it to fund/track delivery.',
    jsonb_build_object('order_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_farmer_on_order ON public.orders;
CREATE TRIGGER trg_notify_farmer_on_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_farmer_on_order();

-- Public read of the publishable Google Maps browser key (used by the client
-- Maps loader). Only this one whitelisted key is exposed; all other app_settings
-- remain admin-only.
DROP POLICY IF EXISTS "Public can read gmaps_browser_key" ON public.app_settings;
CREATE POLICY "Public can read gmaps_browser_key"
  ON public.app_settings FOR SELECT
  TO anon, authenticated
  USING (key = 'gmaps_browser_key');
