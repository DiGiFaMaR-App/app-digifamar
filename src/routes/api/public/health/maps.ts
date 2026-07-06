import { createFileRoute } from "@tanstack/react-router";

/**
 * Public health check endpoint for Google Maps Place Details.
 *
 * Verifies that the current GOOGLE_API_KEY can successfully fetch place
 * details from Google Places API (New) using a well-known reference place.
 */
export const Route = createFileRoute("/api/public/health/maps")({
  server: {
    handlers: {
      GET: async () => {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
          return Response.json(
            { status: "unconfigured", ok: false, error: "GOOGLE_API_KEY is not set" },
            { status: 503 },
          );
        }

        // Canonical Google example place ID (Sydney Opera House). Stable enough for a connectivity check.
        const placeId = "ChIJN1t_tDeuEmsRUsoyG83frY4";
        const fields = "id,displayName,formattedAddress,location";

        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${encodeURIComponent(fields)}&key=${encodeURIComponent(apiKey)}`,
          );

          if (!response.ok) {
            return Response.json(
              {
                status: "degraded",
                ok: false,
                error: `Google returned HTTP ${response.status}`,
              },
              { status: 503 },
            );
          }

          const data = await response.json();
          if (data.status !== "OK") {
            return Response.json(
              {
                status: "degraded",
                ok: false,
                error: `Google Places error: ${data.status}`,
                details: data.error_message ?? null,
              },
              { status: 503 },
            );
          }

          const result = data.result;
          return Response.json({
            status: "healthy",
            ok: true,
            place: {
              id: result.place_id,
              name: result.name ?? null,
              formattedAddress: result.formatted_address ?? null,
              lat: result.geometry?.location?.lat ?? null,
              lng: result.geometry?.location?.lng ?? null,
            },
          });
        } catch (err) {
          return Response.json(
            {
              status: "degraded",
              ok: false,
              error: err instanceof Error ? err.message : "Unknown error",
            },
            { status: 503 },
          );
        }
      },
    },
  },
});
