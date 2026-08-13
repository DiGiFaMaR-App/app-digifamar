ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_method text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS delivery_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_contact_phone text,
  ADD COLUMN IF NOT EXISTS delivery_notes text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_confirmed_at timestamptz;

CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text := NEW.status;
  v_title_buyer text;
  v_title_farmer text;
  v_body text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF v_status IN ('pending','placed') THEN
    v_title_buyer := 'Order placed';
    v_title_farmer := 'New order received';
    v_body := 'Order ' || left(NEW.id::text, 8) || ' has been placed.';
  ELSIF v_status = 'paid' OR v_status = 'escrow_funded' OR v_status = 'in_escrow' THEN
    v_title_buyer := 'Payment held in escrow';
    v_title_farmer := 'Buyer payment secured';
    v_body := 'Funds for order ' || left(NEW.id::text, 8) || ' are held safely in escrow.';
  ELSIF v_status = 'requires_action' THEN
    v_title_buyer := 'Action needed on your order';
    v_title_farmer := 'Order needs buyer action';
    v_body := 'Order ' || left(NEW.id::text, 8) || ' needs an extra step before payment completes.';
  ELSIF v_status IN ('delivered','inspection') THEN
    v_title_buyer := 'Delivery confirmed';
    v_title_farmer := 'Buyer confirmed delivery';
    v_body := 'Order ' || left(NEW.id::text, 8) || ' was delivered. Escrow can now be released.';
  ELSIF v_status = 'disputed' THEN
    v_title_buyer := 'Dispute opened';
    v_title_farmer := 'Dispute opened';
    v_body := 'Order ' || left(NEW.id::text, 8) || ' is in dispute. Escrow is frozen until it is resolved.';
  ELSIF v_status = 'released' THEN
    v_title_buyer := 'Escrow released';
    v_title_farmer := 'You have been paid';
    v_body := 'Escrow for order ' || left(NEW.id::text, 8) || ' has been released to the farmer.';
  ELSIF v_status = 'cancelled' THEN
    v_title_buyer := 'Order cancelled';
    v_title_farmer := 'Order cancelled';
    v_body := 'Order ' || left(NEW.id::text, 8) || ' was cancelled.';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES
    (NEW.buyer_id, 'order_status', v_title_buyer, v_body,
     jsonb_build_object('order_id', NEW.id, 'status', v_status, 'role', 'buyer')),
    (NEW.farmer_id, 'order_status', v_title_farmer, v_body,
     jsonb_build_object('order_id', NEW.id, 'status', v_status, 'role', 'farmer'));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_status_notify ON public.orders;
CREATE TRIGGER trg_orders_status_notify
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_change();