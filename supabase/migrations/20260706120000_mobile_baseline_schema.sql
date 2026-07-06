-- =============================================================================
-- DiGiFaMaR — consolidated baseline schema for the self-contained mobile app.
--
-- Why this exists: the historical migration files diverged from the real
-- database the app code is typed against (src/integrations/supabase/types.ts).
-- Most notably the tracked `orders` table used an `items` JSONB design while the
-- code (and every later migration) uses `listing_id`/`qty`/`farmer_id`. Replaying
-- that history is impossible (later migrations reference tables/columns the early
-- ones never create). This file rebuilds the schema in ONE internally-consistent
-- pass that exactly matches the code's contract, and folds in the security
-- invariants (RLS, order validation, escrow-ledger immutability, chat contact
-- guard, wallet/role auto-provisioning) from the old migrations.
--
-- Table shapes mirror types.ts. Statuses are TEXT (as in types.ts) with a CHECK
-- covering every status used by either the client flow or the escrow engine.
-- =============================================================================

-- Defer function-body validation so SQL functions may reference tables that are
-- created later in this single-batch baseline (e.g. has_role -> user_roles).
SET check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- Extensions & helpers
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Roles enum + role check
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'farmer', 'buyer', 'lender');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;
-- RLS policies on publicly-readable tables (e.g. listings, reviews) reference
-- has_role for the admin branch, so anon must be able to execute it (it safely
-- returns false for a null/anon uid).
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert their own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update their own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins manage all profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT DELETE ON public.profiles TO authenticated;

-- ---------------------------------------------------------------------------
-- user_roles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
-- Role assignment is server-side only (handle_new_user / admin service role).
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- farmer_profiles / buyer_profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.farmer_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  acres NUMERIC,
  years_farming INTEGER,
  products TEXT[] NOT NULL DEFAULT '{}',
  certifications TEXT[] NOT NULL DEFAULT '{}',
  verification_status TEXT NOT NULL DEFAULT 'pending',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.farmer_profiles TO authenticated;
GRANT ALL ON public.farmer_profiles TO service_role;
ALTER TABLE public.farmer_profiles ENABLE ROW LEVEL SECURITY;
-- Owner + admin only; public/aggregate browse goes through service role.
CREATE POLICY "Farmers view own profile"
  ON public.farmer_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Farmers insert their own farm profile"
  ON public.farmer_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Farmers update their own farm profile"
  ON public.farmer_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_farmer_profiles_state  ON public.farmer_profiles (state);
CREATE INDEX IF NOT EXISTS idx_farmer_profiles_city   ON public.farmer_profiles (city);
CREATE INDEX IF NOT EXISTS idx_farmer_profiles_zip    ON public.farmer_profiles (zip);
CREATE INDEX IF NOT EXISTS idx_farmer_profiles_coords ON public.farmer_profiles (lat, lng);

CREATE TABLE IF NOT EXISTS public.buyer_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT,
  zip TEXT,
  delivery_window TEXT,
  delivery_frequency TEXT,
  contactless BOOLEAN NOT NULL DEFAULT false,
  sms_updates BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.buyer_profiles TO authenticated;
GRANT ALL ON public.buyer_profiles TO service_role;
ALTER TABLE public.buyer_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see only their buyer profile"
  ON public.buyer_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert their own buyer profile"
  ON public.buyer_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own buyer profile"
  ON public.buyer_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Signup: auto-create profile + role (+ wallet via profiles trigger below)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  chosen_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(meta->>'full_name', meta->>'name', NEW.email),
    NEW.email,
    meta->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;

  BEGIN
    chosen_role := COALESCE(meta->>'role', 'buyer')::public.app_role;
  EXCEPTION WHEN others THEN
    chosen_role := 'buyer';
  END;
  IF chosen_role = 'admin' THEN
    chosen_role := 'buyer';  -- admin is never self-assigned
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, chosen_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- listings  (marketplace catalog; shape mirrors types.ts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  qty_available INTEGER NOT NULL DEFAULT 0 CHECK (qty_available >= 0),
  unit TEXT NOT NULL DEFAULT 'each',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status = ANY (ARRAY['active','paused','sold_out','archived'])),
  images TEXT[] NOT NULL DEFAULT '{}',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT SELECT ON public.listings TO anon;
GRANT ALL ON public.listings TO service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
-- Public can browse active listings; farmers manage their own; admins manage all.
CREATE POLICY "Active listings are public"
  ON public.listings FOR SELECT TO anon, authenticated
  USING (status = 'active' OR auth.uid() = farmer_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Farmers insert their own listings"
  ON public.listings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = farmer_id);
CREATE POLICY "Farmers update their own listings"
  ON public.listings FOR UPDATE TO authenticated
  USING (auth.uid() = farmer_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = farmer_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Farmers delete their own listings"
  ON public.listings FOR DELETE TO authenticated
  USING (auth.uid() = farmer_id OR public.has_role(auth.uid(), 'admin'));
-- Precise coordinates are privileged; browse strips/aggregates them server-side.
REVOKE SELECT (lat, lng) ON public.listings FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_listings_farmer   ON public.listings (farmer_id);
CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings (category);
CREATE INDEX IF NOT EXISTS idx_listings_status   ON public.listings (status);
CREATE INDEX IF NOT EXISTS idx_listings_coords   ON public.listings (lat, lng);
CREATE TRIGGER trg_listings_updated BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- orders  (shape mirrors types.ts: listing_id / qty / farmer_id)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farmer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL CHECK (qty > 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status = ANY (ARRAY[
      'pending','negotiating','paid','in_escrow','escrow_funded','awaiting_delivery',
      'shipped','delivered','inspection','released','refunded','disputed','penalized','cancelled'
    ])),
  subtotal_cents INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  platform_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (platform_fee_cents >= 0),
  escrow_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (escrow_fee_cents >= 0),
  total_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  shipping_address TEXT,
  notes TEXT,
  delivery_deadline TIMESTAMPTZ,
  release_code_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers read their own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Farmers read their own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = farmer_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Buyers create their own orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Buyers update their orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id) WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Farmers update their orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (auth.uid() = farmer_id) WITH CHECK (auth.uid() = farmer_id);
CREATE POLICY "Admins manage all orders" ON public.orders
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only non-financial fields are client-updatable; the rest are server-only.
GRANT UPDATE (status, shipping_address, notes, delivery_deadline, updated_at)
  ON public.orders TO authenticated;
GRANT DELETE ON public.orders TO authenticated;  -- gated to admins by RLS

-- Server recomputes farmer/price/fees on insert; the client never sets money.
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
  NEW.platform_fee_cents := GREATEST(0, ROUND(NEW.subtotal_cents * 0.08))::int;
  NEW.escrow_fee_cents := GREATEST(0, ROUND(NEW.subtotal_cents * 0.0325))::int;
  NEW.total_cents := NEW.subtotal_cents + NEW.platform_fee_cents + NEW.escrow_fee_cents;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validate_order_insert_trg ON public.orders;
CREATE TRIGGER validate_order_insert_trg
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_order_insert();

-- Client updates: financial/identity columns immutable; restricted status moves.
-- Service role (uid IS NULL) bypasses — the escrow engine drives richer states.
CREATE OR REPLACE FUNCTION public.enforce_orders_update_restrictions()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN NEW;  -- server-side (service role)
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
     OR NEW.release_code_hash IS DISTINCT FROM OLD.release_code_hash
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Modification of protected order fields is not allowed';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF uid = OLD.farmer_id
       AND OLD.status IN ('paid','in_escrow','escrow_funded','awaiting_delivery')
       AND NEW.status = 'shipped' THEN
      NULL;
    ELSIF uid = OLD.buyer_id
       AND OLD.status = 'shipped'
       AND NEW.status = 'delivered' THEN
      NULL;
    ELSIF (uid = OLD.buyer_id OR uid = OLD.farmer_id)
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
DROP TRIGGER IF EXISTS trg_enforce_orders_update_restrictions ON public.orders;
CREATE TRIGGER trg_enforce_orders_update_restrictions
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_orders_update_restrictions();
REVOKE ALL ON FUNCTION public.enforce_orders_update_restrictions() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS orders_buyer_idx     ON public.orders (buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_farmer_id ON public.orders (farmer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_listing   ON public.orders (listing_id);

-- ---------------------------------------------------------------------------
-- order_events (append-only audit of order lifecycle; service-role writes)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_events TO authenticated;
GRANT ALL ON public.order_events TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.order_events FROM anon, authenticated;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view order events"
  ON public.order_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_events.order_id
        AND (o.buyer_id = auth.uid() OR o.farmer_id = auth.uid())
    ) OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "No direct client inserts on order events"
  ON public.order_events FOR INSERT TO authenticated WITH CHECK (false);
CREATE INDEX IF NOT EXISTS idx_order_events_order ON public.order_events (order_id, created_at);

-- ---------------------------------------------------------------------------
-- conversations / messages (chat with contact-info guard)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL,
  farmer_id UUID NOT NULL,
  product_id UUID,
  farm_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
GRANT DELETE ON public.conversations TO authenticated;  -- gated to admins by RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view their conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = farmer_id);
CREATE POLICY "Buyers create conversations with verified farmers"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id
    AND EXISTS (
      SELECT 1 FROM public.farmer_profiles fp
      WHERE fp.user_id = conversations.farmer_id
        AND fp.verification_status = 'verified'
    )
  );
CREATE POLICY "Admins read all conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage all conversations" ON public.conversations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_farmer
  ON public.conversations (buyer_id, farmer_id);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  flagged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view messages in their conversations"
  ON public.messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.buyer_id = auth.uid() OR c.farmer_id = auth.uid())
    )
  );
CREATE POLICY "Participants send messages in their conversations"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.buyer_id = auth.uid() OR c.farmer_id = auth.uid())
    )
  );
CREATE POLICY "Admins read all messages"
  ON public.messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS messages_conversation_id_idx
  ON public.messages (conversation_id, created_at);

CREATE OR REPLACE FUNCTION public.guard_message_contact_info()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  b TEXT := lower(NEW.content);
BEGIN
  IF b ~ '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' THEN
    RAISE EXCEPTION 'CONTACT_INFO_BLOCKED: emails are not allowed in chat to keep escrow protection.' USING ERRCODE = 'P0001';
  END IF;
  IF b ~ '(\+?\d[\d\s().-]{6,}\d)' THEN
    RAISE EXCEPTION 'CONTACT_INFO_BLOCKED: phone numbers are not allowed in chat to keep escrow protection.' USING ERRCODE = 'P0001';
  END IF;
  IF b ~ '(whats\s*app|telegram|signal\b|wechat|viber|kakao|line\b|messenger|instagram|ig\s+dm|snap\s*chat|discord|skype|facetime|imessage|cash\s*app|venmo|zelle|paypal|bitcoin|btc\b|crypto)' THEN
    RAISE EXCEPTION 'CONTACT_INFO_BLOCKED: off-platform contact or payment methods are not allowed. Escrow only works inside the app.' USING ERRCODE = 'P0001';
  END IF;
  IF b ~ '(call\s+me|text\s+me|reach\s+me\s+at|dm\s+me|email\s+me|hit\s+me\s+up|outside\s+the\s+app|off\s*-?\s*platform|off\s+the\s+site|my\s+number|my\s+phone|my\s+email)' THEN
    RAISE EXCEPTION 'CONTACT_INFO_BLOCKED: off-platform contact requests are not allowed. Escrow only works inside the app.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.guard_message_contact_info() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_messages_contact_guard ON public.messages;
CREATE TRIGGER trg_messages_contact_guard BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_message_contact_info();

-- Keep the parent conversation's recency columns fresh so inboxes can sort by
-- the most recent activity.
CREATE OR REPLACE FUNCTION public.touch_conversation_on_message()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.conversations
     SET last_message_at = NEW.created_at, updated_at = NEW.created_at
   WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.touch_conversation_on_message() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_messages_touch_conversation ON public.messages;
CREATE TRIGGER trg_messages_touch_conversation AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_conversation_on_message();

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farmer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
-- Public can view reviews attached to active listings; participants/admins always.
CREATE POLICY "Public can view reviews on active listings"
  ON public.reviews FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.listings l ON l.id = o.listing_id
      WHERE o.id = reviews.order_id AND l.status = 'active'
    )
    OR auth.uid() = buyer_id
    OR auth.uid() = farmer_id
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Buyers write reviews for their delivered orders"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = reviews.order_id
        AND o.buyer_id = auth.uid()
        AND o.farmer_id = reviews.farmer_id
    )
  );

-- ---------------------------------------------------------------------------
-- wallets + escrow ledger + delivery/inspection + disputes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE OR REPLACE FUNCTION public.create_wallet_for_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_wallet_for_user() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_profiles_create_wallet ON public.profiles;
CREATE TRIGGER trg_profiles_create_wallet AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_wallet_for_user();

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

CREATE TABLE IF NOT EXISTS public.delivery_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE POLICY "Participants view delivery confirmation (safe cols)"
  ON public.delivery_confirmations FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = delivery_confirmations.order_id
        AND (o.buyer_id = auth.uid() OR o.farmer_id = auth.uid())
    )
  );
REVOKE SELECT (otp_hash, otp_expires_at) ON public.delivery_confirmations FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.inspection_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- ---------------------------------------------------------------------------
-- Lender portal
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lender_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_name TEXT NOT NULL,
  institution_type TEXT NOT NULL,
  charter_number TEXT,
  lending_states TEXT[] NOT NULL DEFAULT '{}',
  min_loan_amount NUMERIC NOT NULL DEFAULT 0,
  max_loan_amount NUMERIC NOT NULL DEFAULT 0,
  contact_name TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  review_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lender_applications_amount_chk CHECK (max_loan_amount >= min_loan_amount)
);
CREATE INDEX IF NOT EXISTS lender_applications_status_idx ON public.lender_applications (status, created_at DESC);
GRANT INSERT ON public.lender_applications TO anon, authenticated;
GRANT SELECT, UPDATE ON public.lender_applications TO authenticated;
GRANT ALL ON public.lender_applications TO service_role;
ALTER TABLE public.lender_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a lender application"
  ON public.lender_applications FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending');
CREATE POLICY "Admins read lender applications"
  ON public.lender_applications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update lender applications"
  ON public.lender_applications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.lender_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.lender_applications(id) ON DELETE SET NULL,
  institution_name TEXT NOT NULL,
  institution_type TEXT NOT NULL,
  charter_number TEXT,
  lending_states TEXT[] NOT NULL DEFAULT '{}',
  min_loan_amount NUMERIC NOT NULL DEFAULT 0,
  max_loan_amount NUMERIC NOT NULL DEFAULT 0,
  contact_name TEXT,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.lender_profiles TO authenticated;
GRANT ALL ON public.lender_profiles TO service_role;
ALTER TABLE public.lender_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lenders read their own profile"
  ON public.lender_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Lenders insert their own profile"
  ON public.lender_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Lenders update their own profile"
  ON public.lender_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.farmer_lender_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_score INTEGER NOT NULL DEFAULT 0,
  twelve_month_sales NUMERIC NOT NULL DEFAULT 0,
  repeat_buyer_pct NUMERIC NOT NULL DEFAULT 0,
  avg_rating NUMERIC NOT NULL DEFAULT 0,
  recommended_amount NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT recommendations_trade_score_chk CHECK (trade_score BETWEEN 0 AND 100),
  CONSTRAINT recommendations_farmer_lender_uniq UNIQUE (farmer_id, lender_id)
);
CREATE INDEX IF NOT EXISTS recommendations_lender_score_idx
  ON public.farmer_lender_recommendations (lender_id, trade_score DESC);
GRANT SELECT ON public.farmer_lender_recommendations TO authenticated;
GRANT ALL ON public.farmer_lender_recommendations TO service_role;
ALTER TABLE public.farmer_lender_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lenders read their recommendations"
  ON public.farmer_lender_recommendations FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.has_role(auth.uid(), 'lender')
      AND (lender_id IS NULL OR lender_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- app_settings (admin-read; public-safe values exposed via server fns)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read app settings"
  ON public.app_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- audit_logs (service-role writes, admin reads, append-only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_role text,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  outcome text NOT NULL DEFAULT 'success',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM authenticated, anon;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx      ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_resource_idx   ON public.audit_logs (resource_type, resource_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx     ON public.audit_logs (action, created_at DESC);
CREATE OR REPLACE FUNCTION public.audit_logs_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$;
DROP TRIGGER IF EXISTS audit_logs_no_update ON public.audit_logs;
CREATE TRIGGER audit_logs_no_update
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_immutable();

-- ---------------------------------------------------------------------------
-- Realtime: chat messages stream (per-conversation topic authorization)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
    END IF;
  END IF;
END $$;

-- REVOKE has_role/handle_new_user execution from client roles (server-only).
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
