-- Private farm details (PII) split out of the publicly browsable farm profile
CREATE TABLE IF NOT EXISTS public.farmer_profiles_private (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  address text,
  usda_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.farmer_profiles_private TO authenticated;
GRANT ALL ON public.farmer_profiles_private TO service_role;

ALTER TABLE public.farmer_profiles_private ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or admin reads private farm details"
  ON public.farmer_profiles_private FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Owner inserts private farm details"
  ON public.farmer_profiles_private FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner updates private farm details"
  ON public.farmer_profiles_private FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_farmer_profiles_private_updated
  BEFORE UPDATE ON public.farmer_profiles_private
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.farmer_profiles_private (user_id, address, usda_number)
SELECT user_id, address, usda_number FROM public.farmer_profiles
WHERE address IS NOT NULL OR usda_number IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.farmer_profiles DROP COLUMN IF EXISTS address;
ALTER TABLE public.farmer_profiles DROP COLUMN IF EXISTS usda_number;

-- Public farm browsing: back to invoker view + narrow public row policy
ALTER VIEW public.public_farms SET (security_invoker = true);

CREATE POLICY "Public can read safe farm fields"
  ON public.farmer_profiles FOR SELECT TO anon, authenticated
  USING (verification_status = ANY (ARRAY['verified'::text, 'pending'::text]));

GRANT SELECT ON public.farmer_profiles TO anon;

-- Reviews: public reads allowed again, but buyer identity is not selectable
DROP VIEW IF EXISTS public.public_reviews;

CREATE POLICY "Public can view reviews on active listings"
  ON public.reviews FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.listings l ON l.id = o.listing_id
    WHERE o.id = reviews.order_id AND l.status = 'active'
  ));

REVOKE SELECT ON public.reviews FROM anon, authenticated;
GRANT SELECT (id, order_id, farmer_id, rating, body, created_at)
  ON public.reviews TO anon, authenticated;