-- Cart & checkout: orders placed by buyers and settled through Escrow.com.
-- Created by the /checkout flow once an Escrow.com transaction is opened.

-- Order lifecycle. 'in_escrow' is the state a freshly-checked-out order lands
-- in: the buyer has paid and funds are held by Escrow.com until delivery.
CREATE TYPE public.order_status AS ENUM (
  'pending',
  'paid',
  'in_escrow',
  'shipped',
  'delivered',
  'released',
  'cancelled',
  'disputed'
);

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.order_status NOT NULL DEFAULT 'in_escrow',

  -- Line items captured at checkout time (product id, name, unit price, qty).
  items JSONB NOT NULL DEFAULT '[]',

  -- Money, in integer cents. Fees mirror src/lib/cart/fees.ts:
  --   platform_fee = 8% of subtotal, escrow_fee = 3.25% of subtotal.
  subtotal_cents     INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  platform_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (platform_fee_cents >= 0),
  escrow_fee_cents   INTEGER NOT NULL DEFAULT 0 CHECK (escrow_fee_cents >= 0),
  total_cents        INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),

  -- Escrow.com settlement reference.
  escrow_provider       TEXT NOT NULL DEFAULT 'escrow.com',
  escrow_transaction_id TEXT,
  escrow_url            TEXT,

  shipping_address TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX orders_buyer_idx ON public.orders (buyer_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Buyers read their own orders; admins read all.
CREATE POLICY "Buyers read their own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR public.has_role(auth.uid(), 'admin'));

-- Buyers create orders only for themselves.
CREATE POLICY "Buyers create their own orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

-- Buyers update their own orders (e.g. confirm delivery); admins update any.
CREATE POLICY "Buyers update their own orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = buyer_id OR public.has_role(auth.uid(), 'admin'));

-- Keep updated_at fresh on every write.
CREATE OR REPLACE FUNCTION public.touch_orders_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_orders_updated_at();
