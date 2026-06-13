/**
 * Escrow-v2 — server-function "controllers" (the 5 spec endpoints).
 *
 * These wrap EscrowV2Service. Money moves only here, on the server,
 * authenticated via requireSupabaseAuth. The frontend never writes to
 * wallets, escrow_ledger, delivery_confirmations, or inspection_windows.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ConfirmDeliveryDto,
  FundEscrowDto,
  GenerateOtpDto,
  RaiseDisputeDto,
  ReleaseEscrowDto,
  ResolveDisputeDto,
} from "./dto";

export const fundEscrowFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => FundEscrowDto.parse(input))
  .handler(async ({ data, context }) => {
    const { EscrowV2Service } = await import("./service.server");
    return EscrowV2Service.fund(context.userId, data.orderId);
  });

export const generateDeliveryOtpFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => GenerateOtpDto.parse(input))
  .handler(async ({ data, context }) => {
    const { EscrowV2Service } = await import("./service.server");
    return EscrowV2Service.generateOtp(context.userId, data.orderId);
  });

export const confirmDeliveryFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ConfirmDeliveryDto.parse(input))
  .handler(async ({ data, context }) => {
    const { EscrowV2Service } = await import("./service.server");
    return EscrowV2Service.confirmDelivery(context.userId, data.orderId, data.otp);
  });

export const releaseEscrowFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ReleaseEscrowDto.parse(input))
  .handler(async ({ data, context }) => {
    const { EscrowV2Service } = await import("./service.server");
    return EscrowV2Service.release({ orderId: data.orderId, actorId: context.userId, auto: false });
  });

export const raiseDisputeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => RaiseDisputeDto.parse(input))
  .handler(async ({ data, context }) => {
    const { EscrowV2Service } = await import("./service.server");
    return EscrowV2Service.raiseDispute(context.userId, data);
  });

export const resolveDisputeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ResolveDisputeDto.parse(input))
  .handler(async ({ data, context }) => {
    const { EscrowV2Service } = await import("./service.server");
    return EscrowV2Service.resolveDispute(context.userId, data);
  });
