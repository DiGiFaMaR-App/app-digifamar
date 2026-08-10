REVOKE ALL ON FUNCTION public.has_active_vip(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_vip(uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.sync_vip_badge() FROM PUBLIC, anon, authenticated;