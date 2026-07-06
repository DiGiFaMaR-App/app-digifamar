-- Lender portal: approved lender accounts (1:1 with auth.users), mirroring
-- the farmer_profiles / buyer_profiles pattern. Created when an admin approves
-- a lender_application and the institution signs in for the first time.

-- Extend the shared role enum with a dedicated lender role.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lender';

CREATE TABLE public.lender_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.lender_applications(id) ON DELETE SET NULL,
  institution_name TEXT NOT NULL,
  institution_type TEXT NOT NULL,
  charter_number TEXT,
  lending_states TEXT[] NOT NULL DEFAULT '{}',
  min_loan_amount NUMERIC NOT NULL DEFAULT 0,
  max_loan_amount NUMERIC NOT NULL DEFAULT 0,
  contact_name TEXT,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',       -- active | suspended
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.lender_profiles TO authenticated;
GRANT ALL ON public.lender_profiles TO service_role;

ALTER TABLE public.lender_profiles ENABLE ROW LEVEL SECURITY;

-- Lenders see and manage only their own profile; admins see all.
CREATE POLICY "Lenders read their own profile"
  ON public.lender_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Lenders insert their own profile"
  ON public.lender_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Lenders update their own profile"
  ON public.lender_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
