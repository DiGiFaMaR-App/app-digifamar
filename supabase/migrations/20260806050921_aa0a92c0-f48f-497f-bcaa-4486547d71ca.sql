-- Waitlist / interest capture for the (not yet live) lending program.

CREATE TABLE public.lender_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  entity_type TEXT NOT NULL DEFAULT 'individual',
  interest_notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lender_leads_entity_type_chk CHECK (entity_type IN ('individual','institutional')),
  CONSTRAINT lender_leads_status_chk CHECK (status IN ('new','contacted','archived'))
);

GRANT INSERT ON public.lender_leads TO anon, authenticated;
GRANT SELECT, UPDATE ON public.lender_leads TO authenticated;
GRANT ALL ON public.lender_leads TO service_role;

ALTER TABLE public.lender_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a lender lead"
  ON public.lender_leads FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'new');

CREATE POLICY "Admins read lender leads"
  ON public.lender_leads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update lender leads"
  ON public.lender_leads FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.farmer_loan_interest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_amount_range TEXT NOT NULL,
  purpose_notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT farmer_loan_interest_status_chk CHECK (status IN ('new','contacted','archived'))
);

CREATE INDEX farmer_loan_interest_farmer_idx
  ON public.farmer_loan_interest (farmer_id, created_at DESC);

GRANT SELECT, INSERT ON public.farmer_loan_interest TO authenticated;
GRANT UPDATE ON public.farmer_loan_interest TO authenticated;
GRANT ALL ON public.farmer_loan_interest TO service_role;

ALTER TABLE public.farmer_loan_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers submit their own loan interest"
  ON public.farmer_loan_interest FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = farmer_id AND status = 'new');

CREATE POLICY "Farmers read their own loan interest"
  ON public.farmer_loan_interest FOR SELECT TO authenticated
  USING (auth.uid() = farmer_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update loan interest"
  ON public.farmer_loan_interest FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));