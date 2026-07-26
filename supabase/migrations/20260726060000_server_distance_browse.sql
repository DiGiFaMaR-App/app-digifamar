-- Server-side distance browse: no raw lat/lng leaves the database for public/anon queries.
-- The client calls search_browse(); all distance math and filtering run in Postgres.

-- Remove the old public_farms view (it exposed raw coords and was empty under RLS anyway).
DROP VIEW IF EXISTS public.public_farms;

-- Pure haversine helper (internal math only; no table access).
CREATE OR REPLACE FUNCTION public.haversine_miles(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 2 * 3958.7613 * asin(least(1.0, sqrt(
    sin(radians(lat2 - lat1) / 2) * sin(radians(lat2 - lat1) / 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * sin(radians(lng2 - lng1) / 2) * sin(radians(lng2 - lng1) / 2)
  )));
$$;

-- Public browse RPC. Returns distance_mi only — never coordinates.
CREATE OR REPLACE FUNCTION public.search_browse(
  origin_lat double precision DEFAULT NULL,
  origin_lng double precision DEFAULT NULL,
  max_miles int DEFAULT 50,
  q text DEFAULT '',
  page int DEFAULT 1,
  page_size int DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset int;
  v_escaped text;
  v_like text;
  v_origin_set boolean := origin_lat IS NOT NULL AND origin_lng IS NOT NULL;
  v_delta_lat double precision;
  v_delta_lng double precision;
  v_farm_list jsonb;
  v_farm_total bigint;
  v_listing_list jsonb;
  v_listing_total bigint;
BEGIN
  q := COALESCE(q, '');
  max_miles := LEAST(GREATEST(COALESCE(max_miles, 50), 1), 500);
  page := GREATEST(COALESCE(page, 1), 1);
  page_size := LEAST(GREATEST(COALESCE(page_size, 20), 1), 50);
  v_offset := (page - 1) * page_size;

  -- Escape ILIKE wildcards in the user query.
  v_escaped := replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_');
  v_like := '%' || v_escaped || '%';

  -- Approximate degree deltas for a cheap bounding-box prefilter.
  v_delta_lat := max_miles / 69.0;
  v_delta_lng := max_miles / (69.0 * GREATEST(cos(radians(origin_lat)), 0.01));

  -- Farms
  WITH farm_dist AS (
    SELECT
      fp.user_id,
      fp.farm_name,
      fp.description,
      fp.city,
      fp.state,
      fp.zip,
      fp.certifications,
      fp.verification_status,
      CASE
        WHEN v_origin_set AND fp.lat IS NOT NULL AND fp.lng IS NOT NULL
        THEN ROUND(public.haversine_miles(origin_lat, origin_lng, fp.lat, fp.lng)::numeric, 2)
        ELSE NULL
      END AS distance_mi
    FROM public.farmer_profiles fp
    WHERE (q = '' OR
      fp.farm_name ILIKE v_like ESCAPE '\' OR
      fp.city ILIKE v_like ESCAPE '\' OR
      fp.state ILIKE v_like ESCAPE '\' OR
      fp.zip ILIKE v_like ESCAPE '\')
      AND (NOT v_origin_set OR (
        fp.lat IS NOT NULL AND fp.lng IS NOT NULL
        AND fp.lat BETWEEN origin_lat - v_delta_lat AND origin_lat + v_delta_lat
        AND fp.lng BETWEEN origin_lng - v_delta_lng AND origin_lng + v_delta_lng
      ))
  ),
  farm_filtered AS (
    SELECT * FROM farm_dist
    WHERE NOT v_origin_set OR distance_mi IS NULL OR distance_mi <= max_miles
  ),
  farm_page AS (
    SELECT to_jsonb(f.*) AS obj
    FROM farm_filtered f
    ORDER BY
      CASE WHEN v_origin_set THEN distance_mi END ASC NULLS LAST,
      f.farm_name
    OFFSET v_offset LIMIT page_size
  )
  SELECT
    COALESCE((SELECT jsonb_agg(obj) FROM farm_page), '[]'::jsonb),
    (SELECT COUNT(*) FROM farm_filtered)
  INTO v_farm_list, v_farm_total;

  -- Listings
  WITH listing_dist AS (
    SELECT
      l.id,
      l.farmer_id,
      l.title,
      l.slug,
      l.category,
      l.price_cents,
      l.unit,
      l.images,
      l.qty_available,
      l.description,
      fp.farm_name,
      CASE
        WHEN v_origin_set AND l.lat IS NOT NULL AND l.lng IS NOT NULL
        THEN ROUND(public.haversine_miles(origin_lat, origin_lng, l.lat, l.lng)::numeric, 2)
        ELSE NULL
      END AS distance_mi
    FROM public.listings l
    LEFT JOIN public.farmer_profiles fp ON fp.user_id = l.farmer_id
    WHERE l.status = 'active'
      AND l.farmer_id IS NOT NULL
      AND (q = '' OR
        l.title ILIKE v_like ESCAPE '\' OR
        l.category ILIKE v_like ESCAPE '\')
      AND (NOT v_origin_set OR (
        l.lat IS NOT NULL AND l.lng IS NOT NULL
        AND l.lat BETWEEN origin_lat - v_delta_lat AND origin_lat + v_delta_lat
        AND l.lng BETWEEN origin_lng - v_delta_lng AND origin_lng + v_delta_lng
      ))
  ),
  listing_filtered AS (
    SELECT * FROM listing_dist
    WHERE NOT v_origin_set OR distance_mi IS NULL OR distance_mi <= max_miles
  ),
  listing_page AS (
    SELECT to_jsonb(l.*) AS obj
    FROM listing_filtered l
    ORDER BY
      CASE WHEN v_origin_set THEN distance_mi END ASC NULLS LAST,
      l.title
    OFFSET v_offset LIMIT page_size
  )
  SELECT
    COALESCE((SELECT jsonb_agg(obj) FROM listing_page), '[]'::jsonb),
    (SELECT COUNT(*) FROM listing_filtered)
  INTO v_listing_list, v_listing_total;

  RETURN jsonb_build_object(
    'farms', v_farm_list,
    'listings', v_listing_list,
    'totalFarms', v_farm_total,
    'totalListings', v_listing_total,
    'page', page,
    'pageSize', page_size
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.haversine_miles(double precision, double precision, double precision, double precision) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_browse(double precision, double precision, int, text, int, int) TO anon, authenticated;
