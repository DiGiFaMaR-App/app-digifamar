/**
 * Escrow-v2 — thin client wrappers that call the server-side release-code RPCs.
 *
 * The actual code generation, hashing, expiry, rate-limiting, and escrow fund
 * release all run inside Supabase Postgres functions. The client never sees the
 * pepper, never hashes the code, and cannot release funds unilaterally.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  ConfirmDeliveryDto,
  FundEscrowDto,
  GenerateOtpDto,
  RaiseDisputeDto,
  ResolveDisputeDto,
} from "./dto";

async function rpc(name: string, args: Record<string, unknown>): Promise<unknown> {
  // The local generated types don't include these RPCs yet; the server API is the source of truth.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(name, args);
  if (error) throw new Error(error.message);
  const record = data as Record<string, unknown> | null;
  if (record && typeof record === "object" && record.error) {
    throw new Error(String(record.error));
  }
  return record;
}

export const fundEscrowFn = async ({ data }: { data: FundEscrowDto }) => {
  const result = (await rpc("fund_escrow", {
    p_order_id: data.orderId,
  })) as { success?: boolean; error?: string } | null;
  if (result && result.error) throw new Error(result.error);
  return { orderId: data.orderId, status: "escrow_funded", heldCents: 0 };
};

export const markShippedFn = async ({ data }: { data: { orderId: string } }) => {
  const result = (await rpc("mark_shipped", {
    p_order_id: data.orderId,
  })) as { success?: boolean; error?: string } | null;
  if (result && result.error) throw new Error(result.error);
  return { orderId: data.orderId, status: "shipped" };
};

export const generateDeliveryOtpFn = async ({ data }: { data: GenerateOtpDto }) => {
  const result = (await rpc("create_release_code", {
    p_order_id: data.orderId,
  })) as { code: string; expires_at?: string } | null;
  if (!result || !result.code) throw new Error("Failed to generate release code");
  return {
    orderId: data.orderId,
    expiresAt: result.expires_at ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    smsDelivered: false,
    maskedPhone: null,
    otp: result.code,
  };
};

export const confirmDeliveryFn = async ({ data }: { data: ConfirmDeliveryDto }) => {
  const result = (await rpc("verify_release_code", {
    p_order_id: data.orderId,
    p_code: data.otp,
  })) as { success: boolean; error?: string; locked_until?: string } | null;
  if (!result || !result.success) throw new Error(result?.error ?? "Invalid release code");
  return {
    orderId: data.orderId,
    status: "released",
    autoReleaseAt: new Date().toISOString(),
  };
};

export const raiseDisputeFn = async ({ data }: { data: RaiseDisputeDto }) => {
  const result = (await rpc("dispute_order", {
    p_order_id: data.orderId,
    p_reason: data.reason,
  })) as { success?: boolean; error?: string } | null;
  if (result && result.error) throw new Error(result.error);
  return { id: data.orderId };
};

export const resolveDisputeFn = async ({ data }: { data: ResolveDisputeDto }) => {
  const result = (await rpc("resolve_dispute", {
    p_order_id: data.disputeId,
    p_resolution: data.outcome,
  })) as { success?: boolean; error?: string } | null;
  if (result && result.error) throw new Error(result.error);
  return { ok: true as const };
};

// Manual release during an inspection window is not part of the release-code
// flow; the farmer must enter the buyer's code to release funds.
export const releaseEscrowFn = async () => {
  throw new Error("releaseEscrow is not implemented; use the 6-digit release code instead");
};
