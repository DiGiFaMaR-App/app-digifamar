-- Lender portal: public applications from lending institutions.
-- Submitted anonymously via /lenders/apply, reviewed by admins in /lenders/admin.

CREATE TABLE public.lender_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_name TEXT NOT NULL,
  institution_type TEXT NOT NULL,            -- bank | credit_union | farm_credit | cdfi | private_fund | other
  charter_number TEXT,
  lending_states TEXT[] NOT NULL DEFAULT '{}',
  min_loan_amount NUMERIC NOT NULL DEFAULT 0,
  max_loan_amount NUMERIC NOT NULL DEFAULT 0,
  contact_name TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending',     -- pending | approved | rejected
  review_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lender_applications_amount_chk CHECK (max_loan_amount >= min_loan_amount)
);

CREATE INDEX lender_applications_status_idx ON public.lender_applications (status, created_at DESC);

-- Anonymous visitors submit applications; admins manage them.
GRANT INSERT ON public.lender_applications TO anon, authenticated;
GRANT SELECT, UPDATE ON public.lender_applications TO authenticated;
GRANT ALL ON public.lender_applications TO service_role;

ALTER TABLE public.lender_applications ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated applicants) may submit an application.
CREATE POLICY "Anyone can submit a lender application"
  ON public.lender_applications FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending');

-- Only admins can read every application (the review queue).
CREATE POLICY "Admins read lender applications"
  ON public.lender_applications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can approve / reject.
CREATE POLICY "Admins update lender applications"
  ON public.lender_applications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
