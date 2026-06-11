-- Defense-in-depth: revoke column-level UPDATE on immutable financial/identity
-- fields from regular roles so RLS UPDATE policies cannot reach them, even if
-- triggers are accidentally dropped.
REVOKE UPDATE (
  id,
  buyer_id,
  farmer_id,
  listing_id,
  qty,
  subtotal_cents,
  platform_fee_cents,
  escrow_fee_cents,
  total_cents,
  release_code_hash,
  created_at
) ON public.orders FROM anon, authenticated;

-- service_role retains full ALL privileges granted previously.
