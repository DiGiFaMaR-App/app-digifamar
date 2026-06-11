// In-memory mock escrow store. Resets on server restart.
// Replace with a real DB (Lovable Cloud) when you're ready to go live.

export type EscrowOrder = {
  id: string;
  productId?: string;
  amount: number;
  buyerId: string;
  buyerPhone?: string;
  status: "held" | "released" | "refunded";
  releaseCode: string;
  createdAt: string;
  releasedAt?: string;
};

const orders = new Map<string, EscrowOrder>();

function makeId() {
  return "DFM-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

// Cryptographically secure 6-digit release code, per order.
function generateReleaseCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 1_000_000).padStart(6, "0");
}

export function createEscrowOrder(input: {
  productId?: string;
  amount: number;
  buyerId: string;
  buyerPhone?: string;
}): EscrowOrder {
  const order: EscrowOrder = {
    id: makeId(),
    productId: input.productId,
    amount: input.amount,
    buyerId: input.buyerId,
    buyerPhone: input.buyerPhone,
    status: "held",
    releaseCode: generateReleaseCode(),
    createdAt: new Date().toISOString(),
  };
  orders.set(order.id, order);
  return order;
}

export function getEscrowOrder(id: string): EscrowOrder | undefined {
  return orders.get(id);
}

export function releaseEscrow(
  id: string,
  userId: string,
  code: string,
): { ok: true; order: EscrowOrder } | { ok: false; error: string; status: number } {
  const order = orders.get(id);
  if (!order) return { ok: false, error: "Order not found", status: 404 };
  if (order.buyerId !== userId) {
    // Do not leak that the order exists to non-buyers.
    return { ok: false, error: "Order not found", status: 404 };
  }
  if (order.status === "released") {
    return { ok: false, error: "Funds already released", status: 409 };
  }
  if (code !== order.releaseCode) {
    return { ok: false, error: "Invalid release code", status: 400 };
  }
  order.status = "released";
  order.releasedAt = new Date().toISOString();
  orders.set(id, order);
  return { ok: true, order };
}
