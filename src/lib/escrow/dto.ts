/**
 * Escrow module — DTOs.
 * NestJS equivalent: escrow.dto.ts
 */
import { z } from "zod";

export const EscrowState = z.enum(["held", "released", "refunded", "disputed"]);
export type EscrowState = z.infer<typeof EscrowState>;

export const HoldFundsDto = z.object({
  orderId: z.string().min(1),
  amountCents: z.number().int().positive().max(100_000_000),
});
export type HoldFundsDto = z.infer<typeof HoldFundsDto>;

export const EscrowDto = z.object({
  id: z.string(),
  orderId: z.string(),
  amountCents: z.number(),
  state: EscrowState,
  heldAt: z.string(),
  resolvedAt: z.string().nullable(),
});
export type EscrowDto = z.infer<typeof EscrowDto>;
