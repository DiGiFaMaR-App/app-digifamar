DO $$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
    INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'orders'
    AND column_name NOT IN ('release_code_hash');
  EXECUTE 'REVOKE SELECT ON public.orders FROM authenticated';
  EXECUTE 'REVOKE SELECT ON public.orders FROM anon';
  EXECUTE format('GRANT SELECT (%s) ON public.orders TO authenticated', cols);
END $$;

DO $$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
    INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'delivery_confirmations'
    AND column_name NOT IN ('otp_hash', 'attempts');
  EXECUTE 'REVOKE SELECT ON public.delivery_confirmations FROM authenticated';
  EXECUTE 'REVOKE SELECT ON public.delivery_confirmations FROM anon';
  EXECUTE format('GRANT SELECT (%s) ON public.delivery_confirmations TO authenticated', cols);
END $$;

GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.delivery_confirmations TO service_role;