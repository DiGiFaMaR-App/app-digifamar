-- Permissions that were missing from the notifications table introduced in
-- 20260701060000_selfcontained_view_notifications_payout.sql.
-- Without these, authenticated clients cannot read or mark-as-read their own
-- rows even though the RLS policies allow it, and Edge Functions/triggers
-- cannot insert farmer notifications.

REVOKE ALL ON public.notifications FROM anon;
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
