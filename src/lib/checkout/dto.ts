/**
 * Checkout module — DTOs.
 * NestJS equivalent: checkout.dto.ts
 */
import { z } from "zod";
import { OrderStatus } from "@/lib/orders/dto";

export const CheckoutItemDto = z.object({
  productId: z.string().min(1).max(120),
  name: z.string().min(1).max(200),
  /** Unit price in integer cents. */
  unitPriceCents: z.number().int().nonnegative().max(100_000_000),
  quantity: z.number().int().positive().max(99),
});
export type CheckoutItemDto = z.infer<typeof CheckoutItemDto>;

export const DeliveryMethodDto = z.enum(["pickup", "standard", "express"]);
export type DeliveryMethodDto = z.infer<typeof DeliveryMethodDto>;

export const CreateCheckoutDto = z.object({
  items: z.array(CheckoutItemDto).min(1).max(50),
  shippingAddress: z.string().trim().min(5).max(500),
  deliveryMethod: DeliveryMethodDto.default("standard"),
  /** Buyer→farm distance in miles, used to price distance-based delivery. The
   *  server recomputes the fee from this; it never trusts a client-sent fee. */
  deliveryDistanceMiles: z.number().nonnegative().max(50_000).nullable().optional(),
});
export type CreateCheckoutDto = z.infer<typeof CreateCheckoutDto>;

export const FeeBreakdownDto = z.object({
  subtotalCents: z.number().int(),
  platformFeeCents: z.number().int(),
  escrowFeeCents: z.number().int(),
  deliveryFeeCents: z.number().int(),
  totalCents: z.number().int(),
});
export type FeeBreakdownDto = z.infer<typeof FeeBreakdownDto>;

export const CheckoutResultDto = z.object({
  orderId: z.string(),
  status: OrderStatus,
  breakdown: FeeBreakdownDto,
  escrow: z.object({
    provider: z.literal("escrow.com"),
    transactionId: z.string(),
    url: z.string(),
    /** True when no Escrow.com credentials are configured and the transaction
     *  was simulated (so the demo still completes end-to-end). */
    simulated: z.boolean(),
  }),
  persisted: z.boolean(),
});
export type CheckoutResultDto = z.infer<typeof CheckoutResultDto>;
