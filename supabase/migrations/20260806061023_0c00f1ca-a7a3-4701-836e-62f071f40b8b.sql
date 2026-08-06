-- 1) Move the SECURITY DEFINER role helper out of the API-exposed schema
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2) Rewrite every policy that referenced public.has_role
DROP POLICY IF EXISTS "Admins can read app settings" ON public.app_settings;
CREATE POLICY "Admins can read app settings" ON public.app_settings FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins read audit logs" ON public.audit_logs;
CREATE POLICY "Admins read audit logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Participants add dispute events" ON public.dispute_events;
CREATE POLICY "Participants add dispute events" ON public.dispute_events FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid() AND (
      EXISTS (SELECT 1 FROM public.orders o WHERE o.id = dispute_events.order_id AND (o.buyer_id = auth.uid() OR o.farmer_id = auth.uid()))
      OR private.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Participants view dispute events" ON public.dispute_events;
CREATE POLICY "Participants view dispute events" ON public.dispute_events FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = dispute_events.order_id AND (o.buyer_id = auth.uid() OR o.farmer_id = auth.uid()))
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Admins manage disputes" ON public.disputes;
CREATE POLICY "Admins manage disputes" ON public.disputes FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Participants view disputes" ON public.disputes;
CREATE POLICY "Participants view disputes" ON public.disputes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = disputes.order_id AND (o.buyer_id = auth.uid() OR o.farmer_id = auth.uid()))
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Participants view ledger" ON public.escrow_ledger;
CREATE POLICY "Participants view ledger" ON public.escrow_ledger FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = escrow_ledger.order_id AND (o.buyer_id = auth.uid() OR o.farmer_id = auth.uid()))
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Admins update loan interest" ON public.farmer_loan_interest;
CREATE POLICY "Admins update loan interest" ON public.farmer_loan_interest FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Farmers read their own loan interest" ON public.farmer_loan_interest;
CREATE POLICY "Farmers read their own loan interest" ON public.farmer_loan_interest FOR SELECT TO authenticated
  USING (auth.uid() = farmer_id OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Farmers view own profile" ON public.farmer_profiles;
CREATE POLICY "Farmers view own profile" ON public.farmer_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins read lender leads" ON public.lender_leads;
CREATE POLICY "Admins read lender leads" ON public.lender_leads FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins update lender leads" ON public.lender_leads;
CREATE POLICY "Admins update lender leads" ON public.lender_leads FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Participants view reviews" ON public.reviews;
CREATE POLICY "Participants view reviews" ON public.reviews FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = farmer_id OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Participants read dispute evidence" ON storage.objects;
CREATE POLICY "Participants read dispute evidence" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'dispute-evidence' AND (
      private.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id::text = (storage.foldername(storage.objects.name))[1]
          AND (o.buyer_id = auth.uid() OR o.farmer_id = auth.uid())
      )
    )
  );

-- 3) public.has_role remains for trusted server-side/system callers only
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- 4) farmer_profiles: no public row-level read; safe columns via definer view only
DROP POLICY IF EXISTS "Public can read safe farm fields" ON public.farmer_profiles;
REVOKE SELECT ON public.farmer_profiles FROM anon;

ALTER VIEW public.public_farms SET (security_invoker = false);
REVOKE ALL ON public.public_farms FROM anon, authenticated;
GRANT SELECT ON public.public_farms TO anon, authenticated;

-- 5) reviews: no public table read; buyer identity never exposed publicly
DROP POLICY IF EXISTS "Public can view reviews on active listings" ON public.reviews;
REVOKE SELECT ON public.reviews FROM anon;

CREATE OR REPLACE VIEW public.public_reviews AS
  SELECT r.id, r.order_id, r.farmer_id, r.rating, r.body, r.created_at
  FROM public.reviews r
  JOIN public.orders o ON o.id = r.order_id
  JOIN public.listings l ON l.id = o.listing_id
  WHERE l.status = 'active';
ALTER VIEW public.public_reviews SET (security_invoker = false);
REVOKE ALL ON public.public_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_reviews TO anon, authenticated;