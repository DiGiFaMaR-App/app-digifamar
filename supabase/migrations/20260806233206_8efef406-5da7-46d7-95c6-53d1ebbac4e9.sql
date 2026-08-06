CREATE TABLE IF NOT EXISTS public.lender_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_name text NOT NULL,
  institution_type text NOT NULL,
  charter_number text,
  lending_states text[] NOT NULL DEFAULT '{}',
  min_loan_amount numeric NOT NULL DEFAULT 0,
  max_loan_amount numeric NOT NULL DEFAULT 0,
  contact_name text,
  contact_email text NOT NULL,
  contact_phone text,
  status text NOT NULL DEFAULT 'pending',
  review_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.lender_applications TO anon;
GRANT SELECT, INSERT, UPDATE ON public.lender_applications TO authenticated;
GRANT ALL ON public.lender_applications TO service_role;
ALTER TABLE public.lender_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a lender application" ON public.lender_applications FOR INSERT TO authenticated, anon WITH CHECK (status = 'pending');
CREATE POLICY "Admins read lender applications" ON public.lender_applications FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update lender applications" ON public.lender_applications FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.lender_profiles (
  user_id uuid PRIMARY KEY,
  application_id uuid,
  institution_name text NOT NULL,
  institution_type text NOT NULL,
  charter_number text,
  lending_states text[] NOT NULL DEFAULT '{}',
  min_loan_amount numeric NOT NULL DEFAULT 0,
  max_loan_amount numeric NOT NULL DEFAULT 0,
  contact_name text,
  contact_phone text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.lender_profiles TO authenticated;
GRANT ALL ON public.lender_profiles TO service_role;
ALTER TABLE public.lender_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lenders insert their own profile" ON public.lender_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Lenders read their own profile" ON public.lender_profiles FOR SELECT TO authenticated USING ((auth.uid() = user_id) OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Lenders update their own profile" ON public.lender_profiles FOR UPDATE TO authenticated USING ((auth.uid() = user_id) OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.farmer_lender_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL,
  lender_id uuid,
  trade_score integer NOT NULL DEFAULT 0,
  twelve_month_sales numeric NOT NULL DEFAULT 0,
  repeat_buyer_pct numeric NOT NULL DEFAULT 0,
  avg_rating numeric NOT NULL DEFAULT 0,
  recommended_amount numeric NOT NULL DEFAULT 0,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.farmer_lender_recommendations TO authenticated;
GRANT ALL ON public.farmer_lender_recommendations TO service_role;
ALTER TABLE public.farmer_lender_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lenders read their recommendations" ON public.farmer_lender_recommendations FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role) OR (private.has_role(auth.uid(), 'lender'::app_role) AND ((lender_id IS NULL) OR (lender_id = auth.uid()))));

CREATE UNIQUE INDEX IF NOT EXISTS recommendations_farmer_lender_uniq
  ON public.farmer_lender_recommendations (farmer_id, COALESCE(lender_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX IF NOT EXISTS recommendations_lender_score_idx
  ON public.farmer_lender_recommendations (lender_id, trade_score DESC);
CREATE INDEX IF NOT EXISTS lender_applications_status_idx
  ON public.lender_applications (status, created_at DESC);

CREATE TRIGGER trg_lender_applications_updated BEFORE UPDATE ON public.lender_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_lender_profiles_updated BEFORE UPDATE ON public.lender_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_recommendations_updated BEFORE UPDATE ON public.farmer_lender_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();