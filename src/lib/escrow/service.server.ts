/**
 * Escrow module — server-side service.
 * NestJS equivalent: escrow.service.ts
 */
import { OrdersService } from "@/lib/orders/service.server";
import type { EscrowDto, EscrowState, HoldFundsDto } from "./dto";

const escrows = new Map<string, EscrowDto>();

type Role = "buyer" | "farmer";

function assertOrderRole(userId: string, orderId: string): Role {
  const order = OrdersService._internalFindById(orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);
  if (order.buyerId === userId) return "buyer";
  if (order.farmerId === userId) return "farmer";
  throw new Error("Forbidden");
}

export class EscrowService {
  static hold(userId: string, input: HoldFundsDto): EscrowDto {
    // Only the buyer may put their own funds into escrow.
    const role = assertOrderRole(userId, input.orderId);
    if (role !== "buyer") throw new Error("Forbidden");
    const record: EscrowDto = {
      id: `esc_${crypto.randomUUID()}`,
      orderId: input.orderId,
      amountCents: input.amountCents,
      state: "held",
      heldAt: new Date().toISOString(),
      resolvedAt: null,
    };
    escrows.set(record.id, record);
    return record;
  }

  static findByOrder(orderId: string): EscrowDto | null {
    for (const e of escrows.values()) if (e.orderId === orderId) return e;
    return null;
  }

  private static transition(
    userId: string,
    id: string,
    state: EscrowState,
    allowedRoles: Role[],
  ): EscrowDto {
    const existing = escrows.get(id);
    if (!existing) throw new Error(`Escrow ${id} not found`);
    const role = assertOrderRole(userId, existing.orderId);
    if (!allowedRoles.includes(role)) throw new Error("Forbidden");
    if (existing.state !== "held") {
      throw new Error(`Escrow ${id} already resolved (${existing.state})`);
    }
    const next: EscrowDto = { ...existing, state, resolvedAt: new Date().toISOString() };
    escrows.set(id, next);
    return next;
  }

  static release(userId: string, id: string): EscrowDto {
    // Only the buyer may release funds to the farmer.
    return this.transition(userId, id, "released", ["buyer"]);
  }
  static refund(userId: string, id: string): EscrowDto {
    // Only the farmer may refund the buyer.
    return this.transition(userId, id, "refunded", ["farmer"]);
  }
  static dispute(userId: string, id: string): EscrowDto {
    // Either party may open a dispute.
    return this.transition(userId, id, "disputed", ["buyer", "farmer"]);
  }
}
