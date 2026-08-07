CREATE OR REPLACE FUNCTION public.validate_order_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_price integer;
  v_farmer uuid;
  v_status text;
BEGIN
  SELECT price_cents, farmer_id, status INTO v_price, v_farmer, v_status
  FROM public.listings WHERE id = NEW.listing_id;
  IF v_price IS NULL THEN
    RAISE EXCEPTION 'Listing % not found', NEW.listing_id;
  END IF;
  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'Listing % is not available for purchase', NEW.listing_id;
  END IF;

  NEW.status := 'pending';
  NEW.release_code_hash := NULL;
  NEW.farmer_id := v_farmer;
  NEW.subtotal_cents := v_price * NEW.qty;
  NEW.platform_fee_cents := GREATEST(0, ROUND(NEW.subtotal_cents * 0.10))::int;
  NEW.escrow_fee_cents := GREATEST(0, ROUND(NEW.subtotal_cents * 0.0325))::int;
  NEW.total_cents := NEW.subtotal_cents + NEW.platform_fee_cents + NEW.escrow_fee_cents;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_order_insert_trg ON public.orders;
CREATE TRIGGER validate_order_insert_trg
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_order_insert();