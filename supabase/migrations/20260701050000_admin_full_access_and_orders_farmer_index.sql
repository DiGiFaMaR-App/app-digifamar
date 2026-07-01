-- Admin full-access RLS policies + a farmer_id index on orders.
--
-- Admin membership is checked via public.has_role(auth.uid(), 'admin')
-- (backed by the user_roles table), NOT a nonexistent profiles.role column.
-- The profiles.role approach would both fail (no such column) and, on a policy
-- attached to profiles, cause infinite RLS recursion; has_role() is a
-- SECURITY DEFINER function that exists precisely to avoid that.
--
-- These policies are additive: Postgres OR-combines permissive policies, so the
-- existing per-user policies continue to apply. Admin writes in this app
-- normally go through the service-role client (which bypasses RLS); these
-- policies additionally let a signed-in admin session manage rows directly.
-- Financial/identity columns on orders remain protected by the immutability
-- trigger regardless of who performs the update.
--
-- Each policy block is guarded on table existence (to_regclass) because some of
-- these tables are created out-of-band (profiles, conversations via the Lovable
-- dashboard / a separate backfill), so a fresh `supabase db reset` must not fail
-- here if a table is not present yet.

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins manage all profiles" ON public.profiles;
    CREATE POLICY "Admins manage all profiles" ON public.profiles
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF to_regclass('public.orders') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins manage all orders" ON public.orders;
    CREATE POLICY "Admins manage all orders" ON public.orders
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF to_regclass('public.conversations') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins manage all conversations" ON public.conversations;
    CREATE POLICY "Admins manage all conversations" ON public.conversations
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Farmers filter orders by farmer_id (farmer dashboards + the
-- "Farmers read their own orders" RLS policy). Mirrors the existing
-- orders_buyer_idx (buyer_id, created_at DESC). The buyer_id-only index from the
-- spec is intentionally omitted as redundant with that composite.
CREATE INDEX IF NOT EXISTS idx_orders_farmer_id
  ON public.orders (farmer_id, created_at DESC);
