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
  .handler(({ data }) => EscrowService.hold(data));

export const releaseEscrowFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => idInput.parse(input))
  .handler(({ data }) => EscrowService.release(data.id));

export const refundEscrowFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => idInput.parse(input))
  .handler(({ data }) => EscrowService.refund(data.id));

export const disputeEscrowFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => idInput.parse(input))
  .handler(({ data }) => EscrowService.dispute(data.id));
