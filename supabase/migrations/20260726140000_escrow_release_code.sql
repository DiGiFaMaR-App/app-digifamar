-- Server-side escrow release-code flow for rlwy.
--
-- The release code is generated for the buyer when an order reaches `shipped`,
-- stored as a hash in order_otps, and expires. The farmer verifies it server-side;
-- only on a match (and within expiry/attempt limits) is the order marked
-- `released`, released_at set, and an escrow ledger entry written.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- ---------------------------------------------------------------------------
-- 1. order status enum: add `awaiting_release` if the remote project uses the
--    `order_status` enum (rlwy does); if it is plain text, this is a no-op.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'order_status' AND typtype = 'e'
  ) THEN
    EXECUTE 'ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS ''awaiting_release''';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. order_otps: add rate-limit and dispute columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.order_otps
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ;

-- Make sure one active code exists per order so create/verify are deterministic.
CREATE UNIQUE INDEX IF NOT EXISTS order_otps_active_order_id_idx
  ON public.order_otps (order_id)
  WHERE consumed_at IS NULL;

-- The buyer only gets the plaintext code back from create_release_code().
-- The farmer never reads this table directly; they call verify_release_code().
ALTER TABLE public.order_otps ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.order_otps TO service_role;
REVOKE ALL ON public.order_otps FROM anon, authenticated;
GRANT SELECT (id, order_id, phone, attempts, consumed_at, created_at)
  ON public.order_otps TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'order_otps' AND policyname = 'Participants view own order otps'
  ) THEN
    CREATE POLICY "Participants view own order otps"
      ON public.order_otps FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.id = order_otps.order_id
            AND (o.buyer_id = auth.uid() OR o.farmer_id = auth.uid())
        )
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. wallets + escrow ledger (rlwy doesn't have these yet, but the release flow
--    needs a place to record the released funds).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  available_balance_cents BIGINT NOT NULL DEFAULT 0,
  held_balance_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets (user_id);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'wallets' AND policyname = 'Users view own wallet'
  ) THEN
    CREATE POLICY "Users view own wallet" ON public.wallets
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wallets_updated ON public.wallets;
CREATE TRIGGER trg_wallets_updated
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Atomic wallet credit used by release_order_funds.
CREATE OR REPLACE FUNCTION public.wallet_credit(p_user_id uuid, p_amount bigint)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance bigint;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    SELECT available_balance_cents INTO new_balance
      FROM public.wallets WHERE user_id = p_user_id;
    RETURN coalesce(new_balance, 0);
  END IF;

  INSERT INTO public.wallets (user_id, available_balance_cents)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE
    SET available_balance_cents =
          public.wallets.available_balance_cents + excluded.available_balance_cents
  RETURNING available_balance_cents INTO new_balance;

  RETURN new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.wallet_credit(uuid, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_credit(uuid, bigint) TO service_role;

CREATE TABLE IF NOT EXISTS public.escrow_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'escrow_ledger' AND policyname = 'Participants view ledger'
  ) THEN
    CREATE POLICY "Participants view ledger" ON public.escrow_ledger
      FOR SELECT TO authenticated USING (
        EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.id = escrow_ledger.order_id
            AND (o.buyer_id = auth.uid() OR o.farmer_id = auth.uid())
        ) OR public.has_role(auth.uid(), 'admin')
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.prevent_ledger_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'escrow_ledger is append-only';
END;
$$;

DROP TRIGGER IF EXISTS trg_ledger_no_update ON public.escrow_ledger;
DROP TRIGGER IF EXISTS trg_ledger_no_delete ON public.escrow_ledger;
CREATE TRIGGER trg_ledger_no_update BEFORE UPDATE ON public.escrow_ledger
  FOR EACH ROW EXECUTE FUNCTION public.prevent_ledger_mutation();
CREATE TRIGGER trg_ledger_no_delete BEFORE DELETE ON public.escrow_ledger
  FOR EACH ROW EXECUTE FUNCTION public.prevent_ledger_mutation();

-- ---------------------------------------------------------------------------
-- 4. disputes table (used by dispute_order / resolve_dispute)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'disputes' AND policyname = 'Participants view disputes'
  ) THEN
    CREATE POLICY "Participants view disputes" ON public.disputes
      FOR SELECT TO authenticated USING (
        EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.id = disputes.order_id
            AND (o.buyer_id = auth.uid() OR o.farmer_id = auth.uid())
        ) OR public.has_role(auth.uid(), 'admin')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'disputes' AND policyname = 'Participants raise disputes'
  ) THEN
    CREATE POLICY "Participants raise disputes" ON public.disputes
      FOR INSERT TO authenticated WITH CHECK (
        raised_by = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.id = disputes.order_id
            AND (o.buyer_id = auth.uid() OR o.farmer_id = auth.uid())
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'disputes' AND policyname = 'Admins manage disputes'
  ) THEN
    CREATE POLICY "Admins manage disputes" ON public.disputes
      FOR UPDATE TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_disputes_updated ON public.disputes;
CREATE TRIGGER trg_disputes_updated
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Vault-backed release-code pepper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_release_pepper()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pepper text;
BEGIN
  SELECT decrypted_secret INTO v_pepper
  FROM vault.decrypted_secrets
  WHERE name = 'release_code_pepper'
  LIMIT 1;

  IF v_pepper IS NULL THEN
    v_pepper := encode(gen_random_bytes(32), 'hex');
    PERFORM vault.create_secret(v_pepper, 'release_code_pepper');
  END IF;

  RETURN v_pepper;
END;
$$;

REVOKE ALL ON FUNCTION public.get_release_pepper() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Cryptographically random 6-digit code generator
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_release_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw bytea;
  v_hex text;
  v_num bigint;
BEGIN
  v_raw := gen_random_bytes(4);
  v_hex := 'x' || encode(v_raw, 'hex');
  -- bit(32)::bigint is signed; shift it to the unsigned range [0, 2^32-1]
  v_num := (v_hex::bit(32)::bigint + 2147483648::bigint) % 4294967296::bigint;
  RETURN lpad((v_num % 1000000)::text, 6, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.generate_release_code() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. Helper: release escrow funds to farmer and write the ledger entry
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.release_order_funds(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_farmer_id uuid;
  v_subtotal integer;
  v_escrow_fee integer;
  v_payout bigint;
  v_new_balance bigint;
BEGIN
  SELECT farmer_id, subtotal_cents, escrow_fee_cents
  INTO v_farmer_id, v_subtotal, v_escrow_fee
  FROM public.orders
  WHERE id = p_order_id;

  IF v_farmer_id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  v_payout := GREATEST(v_subtotal - v_escrow_fee, 0);
  v_new_balance := public.wallet_credit(v_farmer_id, v_payout);

  INSERT INTO public.escrow_ledger (order_id, entry_type, amount_cents, balance_after_cents, user_id, notes)
  VALUES (p_order_id, 'release', v_payout, v_new_balance, v_farmer_id, 'Release code verified');
END;
$$;

REVOKE ALL ON FUNCTION public.release_order_funds(uuid) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. Buyer creates the release code
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_release_code(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id uuid;
  v_farmer_id uuid;
  v_status text;
  v_phone text;
  v_code text;
  v_hash text;
  v_pepper text;
  v_expires timestamptz;
BEGIN
  SELECT buyer_id, farmer_id, status::text, COALESCE(phone, '')
  INTO v_buyer_id, v_farmer_id, v_status, v_phone
  FROM public.orders
  WHERE id = p_order_id;

  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF auth.uid() <> v_buyer_id THEN
    RAISE EXCEPTION 'Only the buyer can create the release code';
  END IF;

  IF v_status <> 'shipped' THEN
    RAISE EXCEPTION 'Order must be shipped before creating a release code';
  END IF;

  v_code := public.generate_release_code();
  v_pepper := public.get_release_pepper();
  v_hash := encode(digest(v_code || p_order_id::text || COALESCE(v_pepper, ''), 'sha256'), 'hex');
  v_expires := now() + interval '7 days';

  INSERT INTO public.order_otps (order_id, code_hash, expires_at, attempts, max_attempts, phone)
  VALUES (p_order_id, v_hash, v_expires, 0, 5, v_phone)
  ON CONFLICT (order_id) WHERE consumed_at IS NULL
  DO UPDATE SET
    code_hash = EXCLUDED.code_hash,
    expires_at = EXCLUDED.expires_at,
    attempts = 0,
    max_attempts = EXCLUDED.max_attempts,
    locked_until = NULL,
    consumed_at = NULL,
    disputed_at = NULL,
    phone = EXCLUDED.phone;

  UPDATE public.orders SET status = 'awaiting_release' WHERE id = p_order_id;

  RETURN jsonb_build_object('code', v_code, 'expires_at', v_expires);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_release_code(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.create_release_code(uuid) FROM anon;

-- ---------------------------------------------------------------------------
-- 9. Farmer verifies the release code
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_release_code(p_order_id uuid, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id uuid;
  v_farmer_id uuid;
  v_status text;
  v_row public.order_otps%ROWTYPE;
  v_hash text;
  v_pepper text;
  v_now timestamptz := now();
  v_max_attempts int;
BEGIN
  SELECT buyer_id, farmer_id, status::text
  INTO v_buyer_id, v_farmer_id, v_status
  FROM public.orders
  WHERE id = p_order_id;

  IF v_farmer_id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF auth.uid() <> v_farmer_id THEN
    RAISE EXCEPTION 'Only the farmer can verify the release code';
  END IF;

  IF auth.uid() = v_buyer_id THEN
    RAISE EXCEPTION 'The buyer cannot verify their own release code';
  END IF;

  SELECT * INTO v_row
  FROM public.order_otps
  WHERE order_id = p_order_id
    AND consumed_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active release code found for this order');
  END IF;

  -- If the previous lock has expired, reset the attempt counter.
  IF v_row.locked_until IS NOT NULL AND v_row.locked_until <= v_now THEN
    UPDATE public.order_otps
    SET attempts = 0, locked_until = NULL
    WHERE id = v_row.id;

    SELECT * INTO v_row
    FROM public.order_otps
    WHERE id = v_row.id;
  END IF;

  IF v_row.locked_until IS NOT NULL AND v_row.locked_until > v_now THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Release code locked until ' || v_row.locked_until,
      'locked_until', v_row.locked_until
    );
  END IF;

  IF v_row.expires_at < v_now THEN
    RETURN jsonb_build_object('success', false, 'error', 'Release code expired');
  END IF;

  v_max_attempts := COALESCE(v_row.max_attempts, 5);
  v_pepper := public.get_release_pepper();
  v_hash := encode(digest(p_code || p_order_id::text || COALESCE(v_pepper, ''), 'sha256'), 'hex');

  IF v_hash = v_row.code_hash THEN
    UPDATE public.order_otps
    SET consumed_at = v_now, attempts = v_row.attempts + 1
    WHERE id = v_row.id;

    UPDATE public.orders
    SET status = 'released', released_at = v_now
    WHERE id = p_order_id;

    PERFORM public.release_order_funds(p_order_id);

    RETURN jsonb_build_object('success', true);
  END IF;

  -- Wrong code: increment attempts.
  UPDATE public.order_otps
  SET attempts = v_row.attempts + 1
  WHERE id = v_row.id;

  IF v_row.attempts + 1 >= v_max_attempts THEN
    UPDATE public.order_otps
    SET locked_until = v_now + interval '30 minutes'
    WHERE id = v_row.id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Too many failed attempts; locked for 30 minutes',
      'locked_until', v_now + interval '30 minutes'
    );
  END IF;

  RETURN jsonb_build_object('success', false, 'error', 'Invalid release code');
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_release_code(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_release_code(uuid, text) FROM anon;

-- ---------------------------------------------------------------------------
-- 10. Dispute / no-show path
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dispute_order(p_order_id uuid, p_reason text DEFAULT 'Dispute raised')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id uuid;
  v_farmer_id uuid;
  v_status text;
  v_dispute_id uuid;
BEGIN
  SELECT buyer_id, farmer_id, status::text
  INTO v_buyer_id, v_farmer_id, v_status
  FROM public.orders
  WHERE id = p_order_id;

  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF auth.uid() NOT IN (v_buyer_id, v_farmer_id) THEN
    RAISE EXCEPTION 'Only the buyer or farmer can dispute this order';
  END IF;

  IF v_status NOT IN ('shipped', 'awaiting_release') THEN
    RAISE EXCEPTION 'Order cannot be disputed in status %', v_status;
  END IF;

  INSERT INTO public.disputes (order_id, raised_by, reason, state)
  VALUES (p_order_id, auth.uid(), p_reason, 'open')
  RETURNING id INTO v_dispute_id;

  UPDATE public.order_otps
  SET disputed_at = now()
  WHERE order_id = p_order_id;

  UPDATE public.orders
  SET status = 'disputed'
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'dispute_id', v_dispute_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.dispute_order(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.dispute_order(uuid, text) FROM anon;

CREATE OR REPLACE FUNCTION public.resolve_dispute(p_order_id uuid, p_resolution text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispute public.disputes%ROWTYPE;
  v_buyer_id uuid;
  v_farmer_id uuid;
  v_total integer;
  v_subtotal integer;
  v_escrow_fee integer;
  v_new_balance bigint;
  v_half bigint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only an admin can resolve disputes';
  END IF;

  IF p_resolution NOT IN ('release', 'refund', 'split') THEN
    RAISE EXCEPTION 'Resolution must be release, refund, or split';
  END IF;

  SELECT * INTO v_dispute
  FROM public.disputes
  WHERE order_id = p_order_id AND state = 'open'
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No open dispute for this order';
  END IF;

  SELECT buyer_id, farmer_id, total_cents, subtotal_cents, escrow_fee_cents
  INTO v_buyer_id, v_farmer_id, v_total, v_subtotal, v_escrow_fee
  FROM public.orders
  WHERE id = p_order_id;

  IF p_resolution = 'release' THEN
    UPDATE public.orders
    SET status = 'released', released_at = now()
    WHERE id = p_order_id;
    PERFORM public.release_order_funds(p_order_id);

  ELSIF p_resolution = 'refund' THEN
    v_new_balance := public.wallet_credit(v_buyer_id, v_total);
    INSERT INTO public.escrow_ledger (order_id, entry_type, amount_cents, balance_after_cents, user_id, notes)
    VALUES (p_order_id, 'refund', v_total, v_new_balance, v_buyer_id, 'Dispute resolved: full refund');
    UPDATE public.orders SET status = 'refunded' WHERE id = p_order_id;

  ELSIF p_resolution = 'split' THEN
    v_half := v_total / 2;
    v_new_balance := public.wallet_credit(v_buyer_id, v_half);
    INSERT INTO public.escrow_ledger (order_id, entry_type, amount_cents, balance_after_cents, user_id, notes)
    VALUES (p_order_id, 'refund', v_half, v_new_balance, v_buyer_id, 'Dispute resolved: 50% refund');

    v_new_balance := public.wallet_credit(v_farmer_id, GREATEST(v_half - v_escrow_fee, 0));
    INSERT INTO public.escrow_ledger (order_id, entry_type, amount_cents, balance_after_cents, user_id, notes)
    VALUES (p_order_id, 'release', GREATEST(v_half - v_escrow_fee, 0), v_new_balance, v_farmer_id, 'Dispute resolved: 50% release');

    UPDATE public.orders
    SET status = 'released', released_at = now()
    WHERE id = p_order_id;
  END IF;

  UPDATE public.disputes
  SET state = 'resolved',
      resolution = p_resolution,
      resolved_by = auth.uid(),
      resolved_at = now()
  WHERE id = v_dispute.id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_dispute(uuid, text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 11. Order status transition guard (create/update or replace)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_orders_update_restrictions()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
     OR NEW.farmer_id IS DISTINCT FROM OLD.farmer_id
     OR NEW.listing_id IS DISTINCT FROM OLD.listing_id
     OR NEW.qty IS DISTINCT FROM OLD.qty
     OR NEW.subtotal_cents IS DISTINCT FROM OLD.subtotal_cents
     OR NEW.platform_fee_cents IS DISTINCT FROM OLD.platform_fee_cents
     OR NEW.escrow_fee_cents IS DISTINCT FROM OLD.escrow_fee_cents
     OR NEW.total_cents IS DISTINCT FROM OLD.total_cents
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Modification of protected order fields is not allowed';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF uid = OLD.farmer_id
       AND OLD.status::text IN ('paid','in_escrow','escrow_funded','awaiting_delivery')
       AND NEW.status::text = 'shipped' THEN
      NULL;
    ELSIF uid = OLD.buyer_id
       AND OLD.status::text = 'shipped'
       AND NEW.status::text = 'delivered' THEN
      NULL;
    ELSIF uid = OLD.buyer_id
       AND OLD.status::text = 'shipped'
       AND NEW.status::text = 'awaiting_release' THEN
      NULL;
    ELSIF uid = OLD.farmer_id
       AND OLD.status::text = 'awaiting_release'
       AND NEW.status::text = 'released' THEN
      NULL;
    ELSIF (uid = OLD.buyer_id OR uid = OLD.farmer_id)
       AND OLD.status::text IN ('shipped','awaiting_release')
       AND NEW.status::text = 'disputed' THEN
      NULL;
    ELSIF public.has_role(uid, 'admin')
       AND OLD.status::text = 'disputed'
       AND NEW.status::text IN ('released','refunded','cancelled') THEN
      NULL;
    ELSIF (uid = OLD.buyer_id OR uid = OLD.farmer_id)
       AND OLD.status::text = 'pending'
       AND NEW.status::text = 'cancelled' THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'Disallowed order status transition % -> %', OLD.status, NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_orders_update_restrictions ON public.orders;
CREATE TRIGGER trg_enforce_orders_update_restrictions
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_orders_update_restrictions();
