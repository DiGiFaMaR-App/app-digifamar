CREATE POLICY "Participants upload dispute evidence" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'dispute-evidence'
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND (o.buyer_id = auth.uid() OR o.farmer_id = auth.uid())
    )
  );

CREATE POLICY "Participants read dispute evidence" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'dispute-evidence'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id::text = (storage.foldername(name))[1]
          AND (o.buyer_id = auth.uid() OR o.farmer_id = auth.uid())
      )
    )
  );