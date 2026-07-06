GRANT SELECT ON public.reviews TO anon;

CREATE POLICY "Public can view reviews on active listings"
ON public.reviews
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.listings l ON l.id = o.listing_id
    WHERE o.id = reviews.order_id
      AND l.status = 'active'
  )
);