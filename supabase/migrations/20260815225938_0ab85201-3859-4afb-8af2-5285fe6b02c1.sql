ALTER TABLE public.farmer_profiles ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';

CREATE OR REPLACE FUNCTION public.active_plan(_user_id uuid, _env text DEFAULT 'sandbox'::text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT CASE
              WHEN bool_or(price_id = 'elite_monthly') THEN 'elite'
              WHEN bool_or(price_id = 'pro_monthly') THEN 'pro'
            END
     FROM public.subscriptions
     WHERE user_id = _user_id
       AND environment = _env
       AND price_id IN ('pro_monthly', 'elite_monthly')
       AND (
         (status IN ('active','trialing','past_due') AND (current_period_end IS NULL OR current_period_end > now()))
         OR (status = 'canceled' AND current_period_end > now())
       )),
    'free');
$$;

REVOKE ALL ON FUNCTION public.active_plan(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.active_plan(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.plan_listing_limit(_plan text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE _plan WHEN 'elite' THEN 2147483647 WHEN 'pro' THEN 25 ELSE 5 END;
$$;

REVOKE ALL ON FUNCTION public.plan_listing_limit(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.plan_listing_limit(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sync_vip_badge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := COALESCE(NEW.user_id, OLD.user_id);
  env text := COALESCE(NEW.environment, OLD.environment);
BEGIN
  UPDATE public.farmer_profiles
  SET vip_badge = public.has_active_vip(uid, env),
      plan = public.active_plan(uid, env)
  WHERE user_id = uid;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_listing_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_plan text;
  v_limit integer;
  v_count integer;
BEGIN
  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(plan, 'free') INTO v_plan
  FROM public.farmer_profiles WHERE user_id = NEW.farmer_id;
  v_limit := public.plan_listing_limit(COALESCE(v_plan, 'free'));

  SELECT count(*) INTO v_count
  FROM public.listings
  WHERE farmer_id = NEW.farmer_id AND status = 'active' AND id IS DISTINCT FROM NEW.id;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'PLAN_LIMIT_REACHED: your % plan allows % active listings. Upgrade your plan to publish more.', COALESCE(v_plan, 'free'), v_limit
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listings_plan_limit ON public.listings;
CREATE TRIGGER trg_listings_plan_limit
BEFORE INSERT OR UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.enforce_listing_plan_limit();

UPDATE public.farmer_profiles fp
SET plan = public.active_plan(fp.user_id, 'sandbox')
WHERE public.active_plan(fp.user_id, 'sandbox') <> fp.plan;