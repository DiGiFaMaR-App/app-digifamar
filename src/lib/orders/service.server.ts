/**
 * Orders module — server-side service.
 * NestJS equivalent: orders.service.ts
 */
import { ListingsService } from "@/lib/listings/service.server";
import type { CreateOrderDto, OrderDto, OrderStatus } from "./dto";

const orders = new Map<string, OrderDto>();

export class OrdersService {
  static create(buyerId: string, input: CreateOrderDto): OrderDto {
    const listing = ListingsService.findById(input.listingId);
    if (!listing) throw new Error(`Listing ${input.listingId} not found`);
    const order: OrderDto = {
      id: `ord_${crypto.randomUUID()}`,
      buyerId,
      listingId: listing.id,
      quantity: input.quantity,
      totalCents: Math.round(listing.price * 100) * input.quantity,
      status: "pending",
      shippingAddress: input.shippingAddress,
      createdAt: new Date().toISOString(),
    };
    orders.set(order.id, order);
    return order;
  }

  static listForBuyer(buyerId: string): OrderDto[] {
    return Array.from(orders.values()).filter((o) => o.buyerId === buyerId);
  }

  static findById(id: string): OrderDto | null {
    return orders.get(id) ?? null;
  }

  static setStatus(id: string, status: OrderStatus): OrderDto {
    const existing = orders.get(id);
    if (!existing) throw new Error(`Order ${id} not found`);
    const next: OrderDto = { ...existing, status };
    orders.set(id, next);
    return next;
  }
}
