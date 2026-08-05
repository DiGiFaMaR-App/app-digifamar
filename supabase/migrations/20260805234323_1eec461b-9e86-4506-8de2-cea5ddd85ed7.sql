ALTER TABLE public.escrow_ledger DROP CONSTRAINT IF EXISTS escrow_ledger_entry_type_check;
ALTER TABLE public.escrow_ledger
  ADD CONSTRAINT escrow_ledger_entry_type_check
  CHECK (entry_type = ANY (ARRAY['fund'::text, 'hold'::text, 'release'::text, 'refund'::text, 'penalty'::text, 'reversal'::text]));