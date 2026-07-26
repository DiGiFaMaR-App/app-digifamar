-- Minimal order-lifecycle helpers so the release-code flow can be exercised
-- end-to-end through the UI: buyer funds, farmer ships, buyer creates code,
-- farmer verifies.

CREATE OR REPLACE FUNCTION public.fund_escrow(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF auth.uid() <> v_order.buyer_id THEN
    RAISE EXCEPTION 'Only the buyer can fund escrow';
  END IF;

  IF v_order.status::text <> 'pending' AND v_order.status::text <> 'negotiating' THEN
    RAISE EXCEPTION 'Order must be pending to fund escrow';
  END IF;

  UPDATE public.orders SET status = 'escrow_funded' WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'status', 'escrow_funded');
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_shipped(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF auth.uid() <> v_order.farmer_id THEN
    RAISE EXCEPTION 'Only the farmer can mark the order as shipped';
  END IF;

  IF v_order.status::text <> 'escrow_funded' AND v_order.status::text <> 'awaiting_delivery' THEN
    RAISE EXCEPTION 'Order must be escrow funded or awaiting delivery before shipping';
  END IF;

  UPDATE public.orders SET status = 'shipped' WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'status', 'shipped');
END;
$$;

GRANT EXECUTE ON FUNCTION public.fund_escrow(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.fund_escrow(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.mark_shipped(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_shipped(uuid) FROM anon;
