/**
 * Orders module — DTOs.
 * NestJS equivalent: orders.dto.ts
 */
import { z } from "zod";

export const OrderStatus = z.enum([
  "pending",
  "paid",
  "in_escrow",
  "shipped",
  "delivered",
  "released",
  "cancelled",
  "disputed",
]);
export type OrderStatus = z.infer<typeof OrderStatus>;

export const CreateOrderDto = z.object({
  listingId: z.string().min(1),
  quantity: z.number().int().positive().max(1_000),
  shippingAddress: z.string().trim().min(5).max(500),
});
export type CreateOrderDto = z.infer<typeof CreateOrderDto>;

export const OrderDto = z.object({
  id: z.string(),
  buyerId: z.string(),
  listingId: z.string(),
  quantity: z.number(),
  totalCents: z.number(),
  status: OrderStatus,
  shippingAddress: z.string(),
  createdAt: z.string(),
});
export type OrderDto = z.infer<typeof OrderDto>;
