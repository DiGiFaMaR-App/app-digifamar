-- pgcrypto in rlwy lives in the `extensions` schema; make sure the release-code
-- functions can resolve gen_random_bytes and digest by adding it to search_path.

CREATE OR REPLACE FUNCTION public.get_release_pepper()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_pepper text;
BEGIN
  SELECT decrypted_secret INTO v_pepper
  FROM vault.decrypted_secrets
  WHERE name = 'release_code_pepper'
  LIMIT 1;

  IF v_pepper IS NULL THEN
    v_pepper := encode(gen_random_bytes(32), 'hex');
    PERFORM vault.create_secret(v_pepper, 'release_code_pepper');
  END IF;

  RETURN v_pepper;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_release_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_raw bytea;
  v_hex text;
  v_num bigint;
BEGIN
  v_raw := gen_random_bytes(4);
  v_hex := 'x' || encode(v_raw, 'hex');
  v_num := (v_hex::bit(32)::bigint + 2147483648::bigint) % 4294967296::bigint;
  RETURN lpad((v_num % 1000000)::text, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.create_release_code(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_buyer_id uuid;
  v_farmer_id uuid;
  v_status text;
  v_phone text;
  v_code text;
  v_hash text;
  v_pepper text;
  v_expires timestamptz;
BEGIN
  SELECT buyer_id, farmer_id, status::text, COALESCE(phone, '')
  INTO v_buyer_id, v_farmer_id, v_status, v_phone
  FROM public.orders
  WHERE id = p_order_id;

  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF auth.uid() <> v_buyer_id THEN
    RAISE EXCEPTION 'Only the buyer can create the release code';
  END IF;

  IF v_status <> 'shipped' THEN
    RAISE EXCEPTION 'Order must be shipped before creating a release code';
  END IF;

  v_code := public.generate_release_code();
  v_pepper := public.get_release_pepper();
  v_hash := encode(digest(v_code || p_order_id::text || COALESCE(v_pepper, ''), 'sha256'), 'hex');
  v_expires := now() + interval '7 days';

  INSERT INTO public.order_otps (order_id, code_hash, expires_at, attempts, max_attempts, phone)
  VALUES (p_order_id, v_hash, v_expires, 0, 5, v_phone)
  ON CONFLICT (order_id) WHERE consumed_at IS NULL
  DO UPDATE SET
    code_hash = EXCLUDED.code_hash,
    expires_at = EXCLUDED.expires_at,
    attempts = 0,
    max_attempts = EXCLUDED.max_attempts,
    locked_until = NULL,
    consumed_at = NULL,
    disputed_at = NULL,
    phone = EXCLUDED.phone;

  UPDATE public.orders SET status = 'awaiting_release' WHERE id = p_order_id;

  RETURN jsonb_build_object('code', v_code, 'expires_at', v_expires);
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_release_code(p_order_id uuid, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_buyer_id uuid;
  v_farmer_id uuid;
  v_status text;
  v_row public.order_otps%ROWTYPE;
  v_hash text;
  v_pepper text;
  v_now timestamptz := now();
  v_max_attempts int;
BEGIN
  SELECT buyer_id, farmer_id, status::text
  INTO v_buyer_id, v_farmer_id, v_status
  FROM public.orders
  WHERE id = p_order_id;

  IF v_farmer_id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF auth.uid() <> v_farmer_id THEN
    RAISE EXCEPTION 'Only the farmer can verify the release code';
  END IF;

  IF auth.uid() = v_buyer_id THEN
    RAISE EXCEPTION 'The buyer cannot verify their own release code';
  END IF;

  SELECT * INTO v_row
  FROM public.order_otps
  WHERE order_id = p_order_id
    AND consumed_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active release code found for this order');
  END IF;

  IF v_row.locked_until IS NOT NULL AND v_row.locked_until <= v_now THEN
    UPDATE public.order_otps
    SET attempts = 0, locked_until = NULL
    WHERE id = v_row.id;

    SELECT * INTO v_row
    FROM public.order_otps
    WHERE id = v_row.id;
  END IF;

  IF v_row.locked_until IS NOT NULL AND v_row.locked_until > v_now THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Release code locked until ' || v_row.locked_until,
      'locked_until', v_row.locked_until
    );
  END IF;

  IF v_row.expires_at < v_now THEN
    RETURN jsonb_build_object('success', false, 'error', 'Release code expired');
  END IF;

  v_max_attempts := COALESCE(v_row.max_attempts, 5);
  v_pepper := public.get_release_pepper();
  v_hash := encode(digest(p_code || p_order_id::text || COALESCE(v_pepper, ''), 'sha256'), 'hex');

  IF v_hash = v_row.code_hash THEN
    UPDATE public.order_otps
    SET consumed_at = v_now, attempts = v_row.attempts + 1
    WHERE id = v_row.id;

    UPDATE public.orders
    SET status = 'released', released_at = v_now
    WHERE id = p_order_id;

    PERFORM public.release_order_funds(p_order_id);

    RETURN jsonb_build_object('success', true);
  END IF;

  UPDATE public.order_otps
  SET attempts = v_row.attempts + 1
  WHERE id = v_row.id;

  IF v_row.attempts + 1 >= v_max_attempts THEN
    UPDATE public.order_otps
    SET locked_until = v_now + interval '30 minutes'
    WHERE id = v_row.id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Too many failed attempts; locked for 30 minutes',
      'locked_until', v_now + interval '30 minutes'
    );
  END IF;

  RETURN jsonb_build_object('success', false, 'error', 'Invalid release code');
END;
$$;
