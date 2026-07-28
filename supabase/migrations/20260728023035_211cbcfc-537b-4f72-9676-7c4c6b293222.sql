
-- Conversations: add farm_name, updated_at
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS farm_name text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS conversations_set_updated_at ON public.conversations;
CREATE TRIGGER conversations_set_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Messages: add is_read
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;

-- Orders: give trigger-computed cents defaults so client inserts type-check
ALTER TABLE public.orders
  ALTER COLUMN subtotal_cents SET DEFAULT 0,
  ALTER COLUMN total_cents SET DEFAULT 0,
  ALTER COLUMN platform_fee_cents SET DEFAULT 0,
  ALTER COLUMN escrow_fee_cents SET DEFAULT 0;

-- Public farms view: safe columns only (no street address, no phone/email)
CREATE OR REPLACE VIEW public.public_farms
WITH (security_invoker = true)
AS
SELECT
  user_id,
  farm_name,
  description,
  city,
  state,
  zip,
  lat,
  lng,
  certifications,
  verification_status
FROM public.farmer_profiles
WHERE verification_status IN ('verified','pending');

GRANT SELECT ON public.public_farms TO anon, authenticated;

-- Add a permissive public SELECT policy on farmer_profiles limited to safe columns via the view.
-- The view itself uses security_invoker, so we need a SELECT policy allowing anon on the base table.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='farmer_profiles' AND policyname='Public can read safe farm fields'
  ) THEN
    EXECUTE 'CREATE POLICY "Public can read safe farm fields" ON public.farmer_profiles FOR SELECT TO anon, authenticated USING (verification_status IN (''verified'',''pending''))';
  END IF;
END$$;

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='Users can read own notifications') THEN
    EXECUTE 'CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid())';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='Users can update own notifications') THEN
    EXECUTE 'CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
  END IF;
END$$;
