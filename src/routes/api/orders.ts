import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createEscrowOrder } from "@/lib/escrow-store.server";

// Same-origin only — these endpoints are not meant to be called cross-origin.
const CORS = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Vary": "Origin",
} as const;

// Mirrors the NestJS CreateOrderDto:
//   buyerId: UUID
//   listingId: UUID
//   amount: number
//   paymentMethodId: string
const CreateOrderSchema = z.object({
  buyerId: z.string().uuid(),
  listingId: z.string().uuid(),
  amount: z.number().positive().max(100_000),
  paymentMethodId: z.string().min(1).max(120),
});

export const Route = createFileRoute("/api/orders")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: CORS }),

      POST: async ({ request }) => {
        try {
          const raw = await request.json();
          const parsed = CreateOrderSchema.safeParse(raw);
          if (!parsed.success) {
            return new Response(
              JSON.stringify({ error: "Invalid order payload", issues: parsed.error.issues }),
              { status: 400, headers: { "Content-Type": "application/json", ...CORS } },
            );
          }
          const { buyerId, listingId, amount, paymentMethodId } = parsed.data;
          const order = createEscrowOrder({
            productId: listingId,
            amount,
            buyerPhone: buyerId, // reuse buyer field on the mock store
          });
          return new Response(
            JSON.stringify({
              success: true,
              orderId: order.id,
              status: order.status,
              amount: order.amount,
              buyerId,
              listingId,
              paymentMethodId,
            }),
            { status: 201, headers: { "Content-Type": "application/json", ...CORS } },
          );
        } catch {
          return new Response(JSON.stringify({ error: "Malformed JSON body" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
      },
    },
  },
});
