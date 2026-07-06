DROP POLICY IF EXISTS "Buyers create conversations with real farmers" ON public.conversations;
CREATE POLICY "Buyers create conversations with verified farmers"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = buyer_id
  AND EXISTS (
    SELECT 1 FROM public.farmer_profiles fp
    WHERE fp.user_id = conversations.farmer_id
      AND fp.verification_status = 'verified'
  )
);