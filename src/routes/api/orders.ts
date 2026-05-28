import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createEscrowOrder } from "@/lib/escrow-store.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

const CreateOrderSchema = z.object({
  productId: z.string().min(1).max(120).optional(),
  amount: z.number().positive().max(100_000),
  buyerPhone: z
    .string()
    .min(5)
    .max(20)
    .regex(/^\+?[0-9 ()-]+$/)
    .optional(),
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
          const order = createEscrowOrder(parsed.data);
          return new Response(
            JSON.stringify({
              success: true,
              orderId: order.id,
              status: order.status,
              amount: order.amount,
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
