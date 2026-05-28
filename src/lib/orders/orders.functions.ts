/**
 * Orders module — server function "controllers".
 * NestJS equivalent: orders.controller.ts
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { OrdersService } from "./service.server";
import { CreateOrderDto, OrderStatus } from "./dto";

export const createOrderFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CreateOrderDto.parse(input))
  .handler(({ data, context }) => OrdersService.create(context.userId, data));

export const listMyOrdersFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(({ context }) => OrdersService.listForBuyer(context.userId));

export const getOrderFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().min(1) }).parse(input))
  .handler(({ data }) => OrdersService.findById(data.id));

export const setOrderStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().min(1), status: OrderStatus }).parse(input),
  )
  .handler(({ data }) => OrdersService.setStatus(data.id, data.status));
