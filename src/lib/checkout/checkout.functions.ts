/**
 * Checkout module — server function "controller".
 * NestJS equivalent: checkout.controller.ts
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CheckoutService } from "./service.server";
import { CreateCheckoutDto } from "./dto";

/**
 * Create an Escrow.com-protected order from the buyer's cart.
 * Requires an authenticated buyer (Bearer token attached by attachSupabaseAuth).
 */
export const createEscrowCheckoutFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateCheckoutDto.parse(input))
  .handler(({ data, context }) => {
    const email = typeof context.claims?.email === "string" ? context.claims.email : null;
    return CheckoutService.create(
      { supabase: context.supabase, userId: context.userId, buyerEmail: email },
      data,
    );
  });
