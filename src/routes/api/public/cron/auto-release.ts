/**
 * Cron endpoint: auto-release escrow funds whose inspection window has passed,
 * and apply farmer-ghosting penalties on orders that blew past the delivery
 * deadline without an OTP confirmation.
 *
 * Called by pg_cron in Supabase. The endpoint is under /api/public/* so it
 * bypasses the published-site auth, but it requires a shared secret header
 * ("x-cron-secret") that matches the CRON_SECRET env var.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/auto-release")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        const provided = request.headers.get("x-cron-secret");
        if (!secret || provided !== secret) {
          return new Response("unauthorized", { status: 401 });
        }
        const { EscrowV2Service } = await import("@/lib/escrow-v2/service.server");
        const [auto, ghost] = await Promise.all([
          EscrowV2Service.runAutoRelease(),
          EscrowV2Service.runFarmerGhostPenalty(),
        ]);
        return Response.json({
          ok: true,
          autoReleased: auto.released,
          ghostPenalized: ghost.penalized,
        });
      },
    },
  },
});
