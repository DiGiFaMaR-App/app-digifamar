-- The public "Active listings are public" SELECT policy calls public.has_role
-- for the admin branch. Anonymous callers need execute on the function and
-- usage on the enum type, otherwise public browse returns a permission-denied
-- error instead of a filtered result.
GRANT USAGE ON TYPE public.app_role TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon;
