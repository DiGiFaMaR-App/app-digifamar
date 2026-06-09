
-- 1) Realtime: drop the inbox-conversations branch; require per-thread topics
DROP POLICY IF EXISTS "Authenticated can subscribe to own conversation threads" ON realtime.messages;
CREATE POLICY "Authenticated can subscribe to own conversation threads"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'thread-%' THEN EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id::text = SUBSTRING(realtime.topic() FROM 8)
        AND (auth.uid() = c.buyer_id OR auth.uid() = c.farmer_id)
    )
    ELSE false
  END
);

-- 2) order_events: remove client INSERT entirely; only service_role inserts
DROP POLICY IF EXISTS "Participants append order events" ON public.order_events;
REVOKE INSERT ON public.order_events FROM authenticated;
REVOKE INSERT ON public.order_events FROM anon;

-- 3) orders INSERT: force safe defaults and server-recomputed totals
CREATE OR REPLACE FUNCTION public.validate_order_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_price integer;
  v_farmer uuid;
BEGIN
  NEW.status := 'pending';
  NEW.release_code_hash := NULL;

  SELECT price_cents, farmer_id INTO v_price, v_farmer
  FROM public.listings WHERE id = NEW.listing_id;
  IF v_price IS NULL THEN
    RAISE EXCEPTION 'Listing % not found', NEW.listing_id;
  END IF;

  NEW.farmer_id := v_farmer;
  NEW.subtotal_cents := v_price * NEW.qty;
  NEW.platform_fee_cents := GREATEST(0, ROUND(NEW.subtotal_cents * 0.05))::int;
  NEW.escrow_fee_cents := GREATEST(0, ROUND(NEW.subtotal_cents * 0.025))::int;
  NEW.total_cents := NEW.subtotal_cents + NEW.platform_fee_cents + NEW.escrow_fee_cents;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_order_insert_trg ON public.orders;
CREATE TRIGGER validate_order_insert_trg
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.validate_order_insert();

-- 4) orders UPDATE: enforce immutability + state-machine
CREATE OR REPLACE FUNCTION public.enforce_order_update_policy()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
     OR NEW.farmer_id IS DISTINCT FROM OLD.farmer_id
     OR NEW.listing_id IS DISTINCT FROM OLD.listing_id
     OR NEW.qty IS DISTINCT FROM OLD.qty
     OR NEW.subtotal_cents IS DISTINCT FROM OLD.subtotal_cents
     OR NEW.platform_fee_cents IS DISTINCT FROM OLD.platform_fee_cents
     OR NEW.escrow_fee_cents IS DISTINCT FROM OLD.escrow_fee_cents
     OR NEW.total_cents IS DISTINCT FROM OLD.total_cents
     OR NEW.release_code_hash IS DISTINCT FROM OLD.release_code_hash
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Financial and identity fields on orders are immutable from client updates';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF auth.uid() = OLD.farmer_id
       AND OLD.status IN ('paid','in_escrow')
       AND NEW.status = 'shipped' THEN
      NULL;
    ELSIF auth.uid() = OLD.buyer_id
       AND OLD.status = 'shipped'
       AND NEW.status = 'delivered' THEN
      NULL;
    ELSIF (auth.uid() = OLD.buyer_id OR auth.uid() = OLD.farmer_id)
       AND OLD.status = 'pending'
       AND NEW.status = 'cancelled' THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'Disallowed order status transition % -> %', OLD.status, NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_order_update_policy_trg ON public.orders;
CREATE TRIGGER enforce_order_update_policy_trg
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_order_update_policy();
