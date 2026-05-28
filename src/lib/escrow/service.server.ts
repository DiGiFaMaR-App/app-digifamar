/**
 * Escrow module — server-side service.
 * NestJS equivalent: escrow.service.ts
 */
import type { EscrowDto, EscrowState, HoldFundsDto } from "./dto";

const escrows = new Map<string, EscrowDto>();

export class EscrowService {
  static hold(input: HoldFundsDto): EscrowDto {
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

  private static transition(id: string, state: EscrowState): EscrowDto {
    const existing = escrows.get(id);
    if (!existing) throw new Error(`Escrow ${id} not found`);
    if (existing.state !== "held") {
      throw new Error(`Escrow ${id} already resolved (${existing.state})`);
    }
    const next: EscrowDto = { ...existing, state, resolvedAt: new Date().toISOString() };
    escrows.set(id, next);
    return next;
  }

  static release(id: string): EscrowDto {
    return this.transition(id, "released");
  }
  static refund(id: string): EscrowDto {
    return this.transition(id, "refunded");
  }
  static dispute(id: string): EscrowDto {
    return this.transition(id, "disputed");
  }
}
