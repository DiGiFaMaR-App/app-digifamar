import { describe, expect, it } from "vitest";
import {
  createEscrowOrder,
  getEscrowOrder,
  releaseEscrow,
} from "./escrow-store.server";

describe("escrow-store", () => {
  it("creates an order with a 6-digit release code and held status", () => {
    const order = createEscrowOrder({ amount: 1200, buyerPhone: "+15550001" });

    expect(order.id).toMatch(/^DFM-[A-Z0-9]{6}$/);
    expect(order.status).toBe("held");
    expect(order.releaseCode).toMatch(/^\d{6}$/);
    expect(order.amount).toBe(1200);
    expect(getEscrowOrder(order.id)).toEqual(order);
  });

  it("generates unique ids across calls", () => {
    const ids = new Set(
      Array.from({ length: 25 }, () => createEscrowOrder({ amount: 10 }).id),
    );
    expect(ids.size).toBe(25);
  });

  it("releases funds when the correct code is provided", () => {
    const order = createEscrowOrder({ amount: 500 });
    const result = releaseEscrow(order.id, order.releaseCode);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.order.status).toBe("released");
      expect(result.order.releasedAt).toBeDefined();
    }
  });

  it("rejects an invalid release code without changing status", () => {
    const order = createEscrowOrder({ amount: 500 });
    const result = releaseEscrow(order.id, "000000");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.error).toMatch(/invalid/i);
    }
    expect(getEscrowOrder(order.id)?.status).toBe("held");
  });

  it("returns 404 for unknown orders", () => {
    const result = releaseEscrow("DFM-NOPE00", "123456");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it("refuses to double-release a settled order", () => {
    const order = createEscrowOrder({ amount: 99 });
    releaseEscrow(order.id, order.releaseCode);
    const second = releaseEscrow(order.id, order.releaseCode);

    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.status).toBe(409);
  });
});
