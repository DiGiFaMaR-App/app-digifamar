DROP POLICY IF EXISTS "Farmers read own kyc files" ON storage.objects;
CREATE POLICY "Farmers read own kyc files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR private.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );