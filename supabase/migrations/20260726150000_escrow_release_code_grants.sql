-- Allow authenticated users to call resolve_dispute; the function still rejects
-- non-admins internally via public.has_role(auth.uid(), 'admin').
-- This lets auth-boundary tests verify the function-level check rather than
-- a missing-privilege error.
GRANT EXECUTE ON FUNCTION public.resolve_dispute(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.resolve_dispute(uuid, text) FROM anon;
