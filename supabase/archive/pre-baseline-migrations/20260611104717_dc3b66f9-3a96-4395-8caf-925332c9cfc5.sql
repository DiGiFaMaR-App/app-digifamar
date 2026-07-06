DROP POLICY IF EXISTS "Buyers update their orders" ON public.orders;
DROP POLICY IF EXISTS "Farmers update their orders" ON public.orders;

CREATE POLICY "Buyers update their orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Farmers update their orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (auth.uid() = farmer_id)
  WITH CHECK (auth.uid() = farmer_id);