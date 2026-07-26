-- Distance-based delivery pricing for orders.
--
-- Checkout now charges a delivery fee (see src/lib/cart/fees.ts:computeDeliveryFee)
-- on top of the item subtotal + platform/escrow fees, and records which delivery
-- method the buyer chose. The fee is already folded into total_cents (and the
-- escrowed amount); these columns itemize it for receipts and analytics.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_fee_cents INTEGER NOT NULL DEFAULT 0
    CHECK (delivery_fee_cents >= 0);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_method TEXT NOT NULL DEFAULT 'standard'
    CHECK (delivery_method IN ('pickup', 'standard', 'express'));
