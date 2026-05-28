import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { releaseEscrow } from "@/lib/escrow-store.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

const ReleaseSchema = z.object({
  code: z.string().regex(/^[0-9]{6}$/, "Code must be 6 digits"),
});

export const Route = createFileRoute("/api/orders/$id/release")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: CORS }),

      POST: async ({ request, params }) => {
        try {
          const raw = await request.json();
          const parsed = ReleaseSchema.safeParse(raw);
          if (!parsed.success) {
            return new Response(
              JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Invalid code" }),
              { status: 400, headers: { "Content-Type": "application/json", ...CORS } },
            );
          }

          const result = releaseEscrow(params.id, parsed.data.code);
          if (!result.ok) {
            return new Response(JSON.stringify({ error: result.error }), {
              status: result.status,
              headers: { "Content-Type": "application/json", ...CORS },
            });
          }

          return new Response(
            JSON.stringify({
              success: true,
              orderId: result.order.id,
              status: result.order.status,
              releasedAt: result.order.releasedAt,
            }),
            { status: 200, headers: { "Content-Type": "application/json", ...CORS } },
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
