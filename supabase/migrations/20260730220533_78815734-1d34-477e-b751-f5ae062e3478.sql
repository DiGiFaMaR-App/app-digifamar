GRANT SELECT (id, order_id, otp_expires_at, confirmed_at, attempts, created_at) ON public.delivery_confirmations TO authenticated;
GRANT ALL ON public.delivery_confirmations TO service_role;