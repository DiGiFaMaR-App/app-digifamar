/**
 * Escrow-v2 — CLIENT module (self-contained app).
 *
 * The money-moving logic runs in the `escrow` Supabase Edge Function (service
 * role + JWT auth). These thin wrappers call it via supabase.functions.invoke,
 * so there is no TanStack server function and no web host. The export names and
 * `{ data }` input shape are kept for drop-in compatibility with callers.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  ConfirmDeliveryDto,
  FundEscrowDto,
  GenerateOtpDto,
  RaiseDisputeDto,
  ReleaseEscrowDto,
  ResolveDisputeDto,
} from "./dto";

async function invokeEscrow<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("escrow", {
    body: { action, ...payload },
  });
  if (error) {
    // Surface the function's JSON error message when present.
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      const body = await ctx.json().catch(() => null);
      if (body?.error) throw new Error(body.error);
    }
    throw new Error(error.message);
  }
  if (data && typeof data === "object" && "error" in data) {
    throw new Error((data as { error: string }).error);
  }
  return data as T;
}

export const fundEscrowFn = ({ data }: { data: FundEscrowDto }) =>
  invokeEscrow<{ orderId: string; status: string; heldCents: number }>("fund", {
    orderId: data.orderId,
  });

export const generateDeliveryOtpFn = ({ data }: { data: GenerateOtpDto }) =>
  invokeEscrow<{
    orderId: string;
    expiresAt: string;
    smsDelivered: boolean;
    maskedPhone: string | null;
    otp: string | null;
  }>("generate-otp", { orderId: data.orderId });

export const confirmDeliveryFn = ({ data }: { data: ConfirmDeliveryDto }) =>
  invokeEscrow<{ orderId: string; status: string; autoReleaseAt: string }>("confirm-delivery", {
    orderId: data.orderId,
    otp: data.otp,
  });

export const releaseEscrowFn = ({ data }: { data: ReleaseEscrowDto }) =>
  invokeEscrow<{ orderId: string; status: string; releasedCents: number }>("release", {
    orderId: data.orderId,
  });

export const raiseDisputeFn = ({ data }: { data: RaiseDisputeDto }) =>
  invokeEscrow<{ id: string }>("raise-dispute", {
    orderId: data.orderId,
    reason: data.reason,
    evidenceUrls: data.evidenceUrls,
  });

export const resolveDisputeFn = ({ data }: { data: ResolveDisputeDto }) =>
  invokeEscrow<{ ok: true }>("resolve-dispute", {
    disputeId: data.disputeId,
    outcome: data.outcome,
    buyerRefundCents: data.buyerRefundCents,
    resolution: data.resolution,
  });
