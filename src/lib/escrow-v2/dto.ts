/**
 * Escrow-v2 — DTOs for the OTP-gated escrow account model.
 *
 * Money flow:
 *   buyer wallet/payment → escrow account (held)
 *   escrow account       → farmer wallet (released)
 *   escrow account       → buyer wallet  (refunded)
 *   escrow account       → platform     (penalty, 50% on farmer ghost)
 *
 * The farmer wallet is NEVER debited for a penalty — the penalty is taken
 * from money already sitting in escrow for that order.
 */
import { z } from "zod";

export const FundEscrowDto = z.object({
  orderId: z.string().uuid(),
});
export type FundEscrowDto = z.infer<typeof FundEscrowDto>;

export const GenerateOtpDto = z.object({
  orderId: z.string().uuid(),
});
export type GenerateOtpDto = z.infer<typeof GenerateOtpDto>;

export const ConfirmDeliveryDto = z.object({
  orderId: z.string().uuid(),
  otp: z.string().trim().min(4).max(12),
});
export type ConfirmDeliveryDto = z.infer<typeof ConfirmDeliveryDto>;

export const ReleaseEscrowDto = z.object({
  orderId: z.string().uuid(),
});
export type ReleaseEscrowDto = z.infer<typeof ReleaseEscrowDto>;

export const ResolveDisputeDto = z.object({
  disputeId: z.string().uuid(),
  /** "release" → farmer gets full amount; "refund" → buyer gets full refund;
   *  "split"   → partial refund to buyer in cents (buyerRefundCents), rest to farmer. */
  outcome: z.enum(["release", "refund", "split"]),
  buyerRefundCents: z.number().int().nonnegative().optional(),
  resolution: z.string().trim().min(1).max(2000),
});
export type ResolveDisputeDto = z.infer<typeof ResolveDisputeDto>;

export const RaiseDisputeDto = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().min(10).max(2000),
  evidenceUrls: z.array(z.string().url().max(500)).max(10).default([]),
});
export type RaiseDisputeDto = z.infer<typeof RaiseDisputeDto>;
