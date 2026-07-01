/**
 * Orders module — server-side service.
 * NestJS equivalent: orders.service.ts
 */
import { ListingsService } from "@/lib/listings/service.server";
import type { CreateOrderDto, OrderDto, OrderStatus } from "./dto";

const orders = new Map<string, OrderDto & { farmerId?: string }>();

// Status transitions a given role is allowed to perform. Anything else is
// rejected with `Forbidden`. Mirrors the database trigger rules.
const ALLOWED_TRANSITIONS: Record<
  "buyer" | "farmer",
  Partial<Record<OrderStatus, OrderStatus[]>>
> = {
  farmer: {
    pending: ["shipped", "cancelled"],
    paid: ["shipped", "cancelled"],
    in_escrow: ["shipped", "cancelled"],
  },
  buyer: {
    shipped: ["delivered"],
    pending: ["cancelled"],
    delivered: ["released", "disputed"],
  },
};

export class OrdersService {
  static create(buyerId: string, input: CreateOrderDto): OrderDto {
    const listing = ListingsService.findById(input.listingId);
    if (!listing) throw new Error(`Listing ${input.listingId} not found`);
    const order = {
      id: `ord_${crypto.randomUUID()}`,
      buyerId,
      listingId: listing.id,
      quantity: input.quantity,
      totalCents: Math.round(listing.price * 100) * input.quantity,
      status: "pending" as const,
      shippingAddress: input.shippingAddress,
      createdAt: new Date().toISOString(),
      farmerId: (listing as { farmerId?: string }).farmerId,
    };
    orders.set(order.id, order);
    return order;
  }

  static listForBuyer(buyerId: string): OrderDto[] {
    return Array.from(orders.values()).filter((o) => o.buyerId === buyerId);
  }

  /** Returns the order only if the caller is the buyer or the farmer. */
  static findById(userId: string, id: string): OrderDto | null {
    const o = orders.get(id);
    if (!o) return null;
    if (o.buyerId !== userId && o.farmerId !== userId) {
      throw new Error("Forbidden");
    }
    return o;
  }

  static setStatus(userId: string, id: string, status: OrderStatus): OrderDto {
    const existing = orders.get(id);
    if (!existing) throw new Error(`Order ${id} not found`);
    const role: "buyer" | "farmer" | null =
      existing.buyerId === userId ? "buyer" : existing.farmerId === userId ? "farmer" : null;
    if (!role) throw new Error("Forbidden");
    const allowed = ALLOWED_TRANSITIONS[role][existing.status] ?? [];
    if (!allowed.includes(status)) {
      throw new Error(`Disallowed status transition ${existing.status} -> ${status} for ${role}`);
    }
    const next = { ...existing, status };
    orders.set(id, next);
    return next;
  }

  /** Returns the order without an ownership check. Server-only use. */
  static _internalFindById(id: string): (OrderDto & { farmerId?: string }) | null {
    return orders.get(id) ?? null;
  }
}
