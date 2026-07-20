-- Phase 1 — Farmer Onboarding & Verification
-- Makes the (previously inert) verification gate real, closes the self-approval
-- hole, wires real signup phone verification, and repairs the role-assignment
-- bug so new farmers get the 'farmer' role instead of silently becoming buyers.
--
-- NOTE (money/trust-sensitive): this changes RLS on public.listings so that an
-- UNAPPROVED farmer's product can never be inserted/activated, and (below) the
-- orders INSERT policy is tightened so a buyer cannot order against a listing
-- whose farmer is not approved — even if the listing id is known directly.

SET check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- 1. farmer_profiles: constrain status + audit columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.farmer_profiles
  DROP CONSTRAINT IF EXISTS farmer_profiles_verification_status_chk;
ALTER TABLE public.farmer_profiles
  ADD CONSTRAINT farmer_profiles_verification_status_chk
    CHECK (verification_status IN ('pending','under_review','approved','rejected'));

ALTER TABLE public.farmer_profiles ADD COLUMN IF NOT EXISTS verified_at      TIMESTAMPTZ;
ALTER TABLE public.farmer_profiles ADD COLUMN IF NOT EXISTS verified_by      UUID REFERENCES auth.users(id);
ALTER TABLE public.farmer_profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ---------------------------------------------------------------------------
-- 2. profiles: real phone-verification flags
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 3. phone_otps: signup phone verification store (service_role only).
--    Keyed by phone because verification happens BEFORE the auth account
--    exists. Codes are stored hashed; raw codes never touch the DB.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.phone_otps (
  phone       TEXT PRIMARY KEY,
  code_hash   TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  attempts    INT NOT NULL DEFAULT 0,
  verified_at TIMESTAMPTZ,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;
-- No policies + no grants => only service_role (the verify-phone function) may touch it.
REVOKE ALL ON public.phone_otps FROM anon, authenticated;
GRANT ALL ON public.phone_otps TO service_role;

-- On account creation, promote a recently-verified phone to profiles.phone_verified.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  app_meta JSONB := COALESCE(NEW.raw_app_meta_data, '{}'::jsonb);
  chosen_role public.app_role;
  v_phone TEXT := meta->>'phone';
  phone_ok BOOLEAN := false;
BEGIN
  IF v_phone IS NOT NULL THEN
    SELECT (verified_at IS NOT NULL AND verified_at > now() - interval '30 minutes')
      INTO phone_ok
      FROM public.phone_otps WHERE phone = v_phone;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, phone, phone_verified, phone_verified_at)
  VALUES (
    NEW.id,
    COALESCE(meta->>'full_name', meta->>'name', NEW.email),
    NEW.email,
    v_phone,
    COALESCE(phone_ok, false),
    CASE WHEN phone_ok THEN now() ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  BEGIN
    chosen_role := COALESCE(meta->>'role', 'buyer')::public.app_role;
  EXCEPTION WHEN others THEN
    chosen_role := 'buyer';
  END;

  -- Admin is only accepted when trusted app metadata explicitly allows it; it
  -- can never be self-assigned via user-supplied signup metadata. (Preserves
  -- the existing bootstrap path on the canonical project.)
  IF chosen_role = 'admin' THEN
    IF COALESCE(app_meta->>'allow_admin_role', 'false') = 'true'
       AND COALESCE(app_meta->>'role', '') = 'admin' THEN
      chosen_role := 'admin';
    ELSE
      chosen_role := 'buyer';
    END IF;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, chosen_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Close the self-approval hole: a non-admin may edit their own profile but
--    NOT change verification_status / verified_* / rejection_reason.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_farmer_verification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    -- Admin transitions: stamp who/when on approve or reject.
    IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
      IF NEW.verification_status IN ('approved','rejected') THEN
        NEW.verified_at := now();
        NEW.verified_by := auth.uid();
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Non-admin: forbid any change to verification-controlled columns.
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     OR NEW.verified_at      IS DISTINCT FROM OLD.verified_at
     OR NEW.verified_by      IS DISTINCT FROM OLD.verified_by
     OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
    RAISE EXCEPTION 'verification_status can only be changed by an admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_farmer_verification ON public.farmer_profiles;
CREATE TRIGGER trg_guard_farmer_verification
  BEFORE UPDATE ON public.farmer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_farmer_verification();

-- ---------------------------------------------------------------------------
-- 5. Gate LISTINGS on approval — DRAFTS ALLOWED for unapproved farmers.
--    Per the approved Phase 1 design:
--      * An UNAPPROVED farmer may INSERT/UPDATE their own listing ONLY while it
--        stays status='draft'. Drafts are never publicly visible (the existing
--        SELECT policy "Listings read scope" only exposes a row to its owner or
--        an admin) and are never orderable (see section 6).
--      * They cannot flip a listing to 'active' (or any published state) until
--        an admin approves them — enforced by the WITH CHECK below, not the UI.
--      * An APPROVED farmer may use any status (draft/active/paused/…).
--    Publication (status='active') + ordering therefore both require approval,
--    even if the listing id is known directly.
-- ---------------------------------------------------------------------------
-- Allow a 'draft' status so farmers can stage an unpublished listing pre-approval.
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_status_check
    CHECK (status = ANY (ARRAY['draft','active','paused','sold_out','archived']));

CREATE OR REPLACE FUNCTION public.is_approved_farmer(_uid UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.farmer_profiles fp
    WHERE fp.user_id = _uid AND fp.verification_status = 'approved'
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_approved_farmer(UUID) TO anon, authenticated;

-- INSERT: own listing; approved => any status, unapproved => draft only.
-- Drop the existing permissive INSERT policy (canonical name plus older variant)
-- so it can't be OR'd in to bypass the draft gate.
DROP POLICY IF EXISTS "Farmers insert own listings" ON public.listings;
DROP POLICY IF EXISTS "Farmers insert their own listings" ON public.listings;
CREATE POLICY "Farmers insert own listings, publish requires approval"
  ON public.listings FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = farmer_id
    AND (public.is_approved_farmer(auth.uid()) OR status = 'draft')
  );

-- UPDATE: own listing; approved => any status, unapproved => must remain draft.
DROP POLICY IF EXISTS "Farmers update own listings" ON public.listings;
DROP POLICY IF EXISTS "Farmers update their own listings" ON public.listings;
CREATE POLICY "Farmers update own listings, publish requires approval"
  ON public.listings FOR UPDATE TO authenticated
  USING (auth.uid() = farmer_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (
      auth.uid() = farmer_id
      AND (public.is_approved_farmer(auth.uid()) OR status = 'draft')
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Server-side ordering guard: a buyer cannot order against a listing whose
--    farmer is not approved OR whose listing is not 'active' — even if the
--    listing id is passed directly (not just hidden in the UI).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Buyers create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Buyers insert their own orders" ON public.orders;
CREATE POLICY "Buyers order only approved active listings"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id
    AND EXISTS (
      SELECT 1 FROM public.listings l
      JOIN public.farmer_profiles fp ON fp.user_id = l.farmer_id
      WHERE l.id = listing_id
        AND l.farmer_id = orders.farmer_id
        AND l.status = 'active'
        AND fp.verification_status = 'approved'
    )
  );

-- ---------------------------------------------------------------------------
-- 7. DATA FIX (idempotent): repair farmers mis-registered as buyers by the
--    old client signup path (farmer_profile exists but 'farmer' role missing).
--    Adds the farmer role; removes the spurious auto-assigned buyer role only
--    for users who have a farmer_profile (strong evidence of farmer intent).
-- ---------------------------------------------------------------------------
INSERT INTO public.user_roles (user_id, role)
SELECT fp.user_id, 'farmer'::public.app_role
FROM public.farmer_profiles fp
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = fp.user_id AND ur.role = 'farmer'
)
ON CONFLICT (user_id, role) DO NOTHING;

DELETE FROM public.user_roles ur
USING public.farmer_profiles fp
WHERE ur.user_id = fp.user_id
  AND ur.role = 'buyer'
  AND EXISTS (SELECT 1 FROM public.user_roles f WHERE f.user_id = fp.user_id AND f.role = 'farmer');
