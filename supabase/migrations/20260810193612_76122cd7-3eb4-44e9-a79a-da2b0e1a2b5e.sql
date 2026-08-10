DROP POLICY IF EXISTS "Farmers upload own kyc docs" ON public.farmer_kyc_documents;
CREATE POLICY "Farmers upload own kyc docs"
ON public.farmer_kyc_documents
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND review_notes IS NULL
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
);