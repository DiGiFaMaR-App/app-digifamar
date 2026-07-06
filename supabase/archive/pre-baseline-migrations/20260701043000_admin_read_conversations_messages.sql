-- Admin dashboard RLS, implemented the repo's way.
--
-- An external spec proposed admin policies of the form
--   USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
-- That is wrong for this schema: there is no `profiles.role` column (roles live
-- in `user_roles` with the `public.app_role` enum), and a `profiles` policy that
-- sub-selects `profiles` causes recursive RLS. The `public.has_role()`
-- SECURITY DEFINER function exists precisely to avoid that recursion.
--
-- Coverage check for the spec's admin targets:
--   * profiles  -> already "viewable by everyone authenticated" (admins included)
--   * orders    -> buyer+admin and farmer+admin SELECT policies already exist
--   * conversations / messages -> participant-only, NO admin override  <-- added here
--
-- Admin dashboards in this app normally read via the service-role client (which
-- bypasses RLS); these policies additionally allow an authenticated admin JWT to
-- read chat data directly. They are read-only and idempotent.

DROP POLICY IF EXISTS "Admins read all conversations" ON public.conversations;
CREATE POLICY "Admins read all conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins read all messages" ON public.messages;
CREATE POLICY "Admins read all messages"
  ON public.messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
