import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createEscrowOrder } from "@/lib/escrow-store.server";
import { authenticateRequest } from "@/lib/route-auth.server";

// Same-origin only — these endpoints are not meant to be called cross-origin.
const CORS = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  Vary: "Origin",
} as const;

// Mirrors the NestJS CreateOrderDto. The buyer's identity is taken from the
// authenticated session, NEVER from the request body.
const CreateOrderSchema = z.object({
  listingId: z.string().uuid(),
  amount: z.number().positive().max(100_000),
  paymentMethodId: z.string().min(1).max(120),
});

export const Route = createFileRoute("/api/orders")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      POST: async ({ request }) => {
        const auth = await authenticateRequest(request);
        if (!auth.ok) {
          return new Response(JSON.stringify({ error: auth.error }), {
            status: auth.status,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
        try {
          const raw = await request.json();
          const parsed = CreateOrderSchema.safeParse(raw);
          if (!parsed.success) {
            return new Response(
              JSON.stringify({ error: "Invalid order payload", issues: parsed.error.issues }),
              { status: 400, headers: { "Content-Type": "application/json", ...CORS } },
            );
          }
          const { listingId, amount, paymentMethodId } = parsed.data;
          const order = createEscrowOrder({
            productId: listingId,
            amount,
            buyerId: auth.user.userId,
          });
          return new Response(
            JSON.stringify({
              success: true,
              orderId: order.id,
              status: order.status,
              amount: order.amount,
              buyerId: auth.user.userId,
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
