-- CONVERSATIONS: restrict updatable columns + add WITH CHECK preserving participants
REVOKE UPDATE ON public.conversations FROM authenticated, anon;
GRANT UPDATE (last_message_at, updated_at, farm_name) ON public.conversations TO authenticated;

DROP POLICY IF EXISTS "Participants update their conversations" ON public.conversations;
CREATE POLICY "Participants update their conversations"
  ON public.conversations FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = farmer_id)
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = farmer_id);

CREATE OR REPLACE FUNCTION public.enforce_conversation_update_restrictions()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
     OR NEW.farmer_id IS DISTINCT FROM OLD.farmer_id
     OR NEW.product_id IS DISTINCT FROM OLD.product_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Conversation participants and identity fields are immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_conversation_update_restrictions ON public.conversations;
CREATE TRIGGER trg_enforce_conversation_update_restrictions
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_conversation_update_restrictions();

-- ORDERS: re-assert column-level UPDATE grants (financial + stripe columns not writable)
REVOKE UPDATE ON public.orders FROM authenticated, anon;
GRANT UPDATE (
  status, shipping_address, notes, delivery_deadline, updated_at,
  delivery_contact_phone, delivery_notes, delivered_at, delivery_confirmed_at
) ON public.orders TO authenticated;

-- Extend the immutability guard to Stripe reference columns as well.
CREATE OR REPLACE FUNCTION public.enforce_orders_update_restrictions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
     OR NEW.total_cents IS DISTINCT FROM OLD.total_cents
     OR NEW.platform_fee_cents IS DISTINCT FROM OLD.platform_fee_cents
     OR NEW.escrow_fee_cents IS DISTINCT FROM OLD.escrow_fee_cents
     OR NEW.delivery_fee_cents IS DISTINCT FROM OLD.delivery_fee_cents
     OR NEW.release_code_hash IS DISTINCT FROM OLD.release_code_hash
     OR NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id
     OR NEW.stripe_charge_id IS DISTINCT FROM OLD.stripe_charge_id
     OR NEW.stripe_transfer_id IS DISTINCT FROM OLD.stripe_transfer_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Modification of protected order fields is not allowed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_orders_update_restrictions ON public.orders;
CREATE TRIGGER trg_enforce_orders_update_restrictions
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_orders_update_restrictions();
