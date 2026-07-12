-- Atomic wallet operations to eliminate read-modify-write races in the
-- escrow / payout Edge Functions.
--
-- Both functions run with the service role (SECURITY DEFINER, execute revoked
-- from anon/authenticated) and are only ever called from privileged Edge
-- Functions. Concurrency safety comes from doing the credit/claim in a single
-- statement (credit) or under a row lock (claim), so two concurrent invocations
-- can never lose or double-count funds.

-- Atomically add `p_amount` cents to a user's available wallet balance,
-- creating the wallet row if it does not yet exist.
CREATE OR REPLACE FUNCTION public.wallet_credit(p_user_id uuid, p_amount bigint)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance bigint;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    SELECT available_balance_cents INTO new_balance
      FROM public.wallets WHERE user_id = p_user_id;
    RETURN coalesce(new_balance, 0);
  END IF;

  INSERT INTO public.wallets (user_id, available_balance_cents)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE
    SET available_balance_cents =
          public.wallets.available_balance_cents + excluded.available_balance_cents
  RETURNING available_balance_cents INTO new_balance;

  RETURN new_balance;
END;
$$;

-- Atomically claim (zero out) a user's entire available balance, returning the
-- amount that was claimed. Uses a row lock so only one concurrent caller can
-- win the balance; the loser sees 0. The caller performs the external transfer
-- with the returned amount and must call wallet_credit to restore it on failure.
CREATE OR REPLACE FUNCTION public.wallet_claim_available(p_user_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed bigint;
BEGIN
  SELECT available_balance_cents INTO claimed
    FROM public.wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

  IF claimed IS NULL OR claimed <= 0 THEN
    RETURN 0;
  END IF;

  UPDATE public.wallets
    SET available_balance_cents = 0
    WHERE user_id = p_user_id;

  RETURN claimed;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.wallet_credit(uuid, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wallet_claim_available(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_credit(uuid, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.wallet_claim_available(uuid) TO service_role;
