-- 1. Saved farms -------------------------------------------------------------
CREATE TABLE public.saved_farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, farm_id)
);

GRANT SELECT, INSERT, DELETE ON public.saved_farms TO authenticated;
GRANT ALL ON public.saved_farms TO service_role;

ALTER TABLE public.saved_farms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own saved farms" ON public.saved_farms
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users save farms" ON public.saved_farms
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unsave farms" ON public.saved_farms
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. Order tracking timeline --------------------------------------------------
CREATE TABLE public.order_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('placed','packed','shipped','delivered')),
  note text,
  carrier text,
  tracking_number text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_tracking_order ON public.order_tracking (order_id, created_at);

GRANT SELECT, INSERT ON public.order_tracking TO authenticated;
GRANT ALL ON public.order_tracking TO service_role;

ALTER TABLE public.order_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order participants read tracking" ON public.order_tracking
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_tracking.order_id
        AND (o.buyer_id = auth.uid() OR o.farmer_id = auth.uid())
    )
  );

CREATE POLICY "Farmers add tracking" ON public.order_tracking
  FOR INSERT TO authenticated WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_tracking.order_id AND o.farmer_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.notify_buyer_on_tracking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer uuid;
BEGIN
  SELECT buyer_id INTO v_buyer FROM public.orders WHERE id = NEW.order_id;
  IF v_buyer IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_buyer,
      'order_tracking',
      'Order update: ' || NEW.status,
      COALESCE(NEW.note, 'Your order is now ' || NEW.status || '.'),
      jsonb_build_object('order_id', NEW.order_id, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_tracking_notify
  AFTER INSERT ON public.order_tracking
  FOR EACH ROW EXECUTE FUNCTION public.notify_buyer_on_tracking();

-- 3. Farmer KYC documents ------------------------------------------------------
CREATE TABLE public.farmer_kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('government_id','farm_registration','proof_of_address','certification','other')),
  storage_path text NOT NULL,
  file_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  review_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_kyc_docs_user ON public.farmer_kyc_documents (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.farmer_kyc_documents TO authenticated;
GRANT ALL ON public.farmer_kyc_documents TO service_role;

ALTER TABLE public.farmer_kyc_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers read own kyc docs" ON public.farmer_kyc_documents
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Farmers upload own kyc docs" ON public.farmer_kyc_documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins review kyc docs" ON public.farmer_kyc_documents
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Farmers delete own pending kyc docs" ON public.farmer_kyc_documents
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');

CREATE TRIGGER trg_kyc_docs_updated
  BEFORE UPDATE ON public.farmer_kyc_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Notify farmer when verification status changes ---------------------------
CREATE OR REPLACE FUNCTION public.notify_farmer_on_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.user_id,
      'kyc_status',
      'Verification ' || NEW.verification_status,
      'Your farm verification status is now ' || NEW.verification_status || '.',
      jsonb_build_object('verification_status', NEW.verification_status)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_farmer_verification_notify
  AFTER UPDATE ON public.farmer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_farmer_on_verification();