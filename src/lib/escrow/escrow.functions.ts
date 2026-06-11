/**
 * Escrow module — server function "controllers".
 * NestJS equivalent: escrow.controller.ts
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EscrowService } from "./service.server";
import { HoldFundsDto } from "./dto";

const idInput = z.object({ id: z.string().min(1) });

export const holdEscrowFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => HoldFundsDto.parse(input))
  .handler(({ data, context }) => EscrowService.hold(context.userId, data));

export const releaseEscrowFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => idInput.parse(input))
  .handler(({ data, context }) => EscrowService.release(context.userId, data.id));

export const refundEscrowFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => idInput.parse(input))
  .handler(({ data, context }) => EscrowService.refund(context.userId, data.id));

export const disputeEscrowFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => idInput.parse(input))
  .handler(({ data, context }) => EscrowService.dispute(context.userId, data.id));
