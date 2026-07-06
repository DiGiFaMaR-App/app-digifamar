
-- 1) Extend orders.status to include the full state machine
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status = ANY (ARRAY[
    'pending','negotiating','paid','escrow_funded','awaiting_delivery',
    'shipped','delivered','inspection','released','refunded','disputed','penalized','cancelled'
  ]));

-- 2) wallets
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  available_balance_cents BIGINT NOT NULL DEFAULT 0,
  held_balance_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own wallet" ON public.wallets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_wallets_updated BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) escrow_ledger (append-only)
CREATE TABLE IF NOT EXISTS public.escrow_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  entry_type TEXT NOT NULL CHECK (entry_type = ANY (ARRAY['fund','hold','release','refund','penalty'])),
  amount_cents BIGINT NOT NULL,
  balance_after_cents BIGINT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_escrow_ledger_order ON public.escrow_ledger(order_id);
GRANT SELECT ON public.escrow_ledger TO authenticated;
GRANT ALL ON public.escrow_ledger TO service_role;
ALTER TABLE public.escrow_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view ledger" ON public.escrow_ledger
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = escrow_ledger.order_id
        AND (o.buyer_id = auth.uid() OR o.farmer_id = auth.uid())
    ) OR public.has_role(auth.uid(), 'admin')
  );

CREATE OR REPLACE FUNCTION public.prevent_ledger_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'escrow_ledger is append-only';
END;
$$;
CREATE TRIGGER trg_ledger_no_update BEFORE UPDATE ON public.escrow_ledger
  FOR EACH ROW EXECUTE FUNCTION public.prevent_ledger_mutation();
CREATE TRIGGER trg_ledger_no_delete BEFORE DELETE ON public.escrow_ledger
  FOR EACH ROW EXECUTE FUNCTION public.prevent_ledger_mutation();

-- 4) delivery_confirmations
CREATE TABLE IF NOT EXISTS public.delivery_confirmations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  otp_hash TEXT NOT NULL,
  otp_expires_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_confirmations TO authenticated;
GRANT ALL ON public.delivery_confirmations TO service_role;
ALTER TABLE public.delivery_confirmations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view delivery confirmation" ON public.delivery_confirmations
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = delivery_confirmations.order_id
        AND (o.buyer_id = auth.uid() OR o.farmer_id = auth.uid())
    )
  );

-- 5) inspection_windows
CREATE TABLE IF NOT EXISTS public.inspection_windows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  opens_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closes_at TIMESTAMPTZ NOT NULL,
  auto_release_at TIMESTAMPTZ NOT NULL,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.inspection_windows TO authenticated;
GRANT ALL ON public.inspection_windows TO service_role;
ALTER TABLE public.inspection_windows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view inspection window" ON public.inspection_windows
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = inspection_windows.order_id
        AND (o.buyer_id = auth.uid() OR o.farmer_id = auth.uid())
    )
  );

-- 6) disputes
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  raised_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  evidence_urls TEXT[] NOT NULL DEFAULT '{}',
  state TEXT NOT NULL DEFAULT 'open'
    CHECK (state = ANY (ARRAY['open','under_review','resolved','rejected'])),
  resolution TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_disputes_order ON public.disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_state ON public.disputes(state);
GRANT SELECT, INSERT ON public.disputes TO authenticated;
GRANT ALL ON public.disputes TO service_role;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view disputes" ON public.disputes
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = disputes.order_id
        AND (o.buyer_id = auth.uid() OR o.farmer_id = auth.uid())
    ) OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Participants raise disputes" ON public.disputes
  FOR INSERT TO authenticated WITH CHECK (
    raised_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = disputes.order_id
        AND (o.buyer_id = auth.uid() OR o.farmer_id = auth.uid())
    )
  );
CREATE POLICY "Admins manage disputes" ON public.disputes
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_disputes_updated BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7) Auto-create a wallet when a new profile is created
CREATE OR REPLACE FUNCTION public.create_wallet_for_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_profiles_create_wallet ON public.profiles;
CREATE TRIGGER trg_profiles_create_wallet AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_wallet_for_user();

-- Backfill wallets for existing profiles
INSERT INTO public.wallets (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;
