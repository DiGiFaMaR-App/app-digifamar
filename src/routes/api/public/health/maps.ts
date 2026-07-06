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
            `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?key=${encodeURIComponent(apiKey)}`,
            {
              method: "GET",
              headers: {
                "X-Goog-FieldMask": fields,
                Accept: "application/json",
              },
            },
          );

          if (!response.ok) {
            const text = await response.text().catch(() => "");
            return Response.json(
              {
                status: "degraded",
                ok: false,
                error: `Google returned HTTP ${response.status}${text ? ` — ${text}` : ""}`,
              },
              { status: 503 },
            );
          }

          const data = (await response.json()) as {
            id?: string;
            displayName?: { text?: string };
            formattedAddress?: string;
            location?: { latitude?: number; longitude?: number };
            error?: { message?: string; status?: string };
          };

          if (data.error) {
            return Response.json(
              {
                status: "degraded",
                ok: false,
                error: `Google Places error: ${data.error.message ?? data.error.status ?? "unknown"}`,
              },
              { status: 503 },
            );
          }

          return Response.json({
            status: "healthy",
            ok: true,
            place: {
              id: data.id ?? placeId,
              name: data.displayName?.text ?? null,
              formattedAddress: data.formattedAddress ?? null,
              lat: data.location?.latitude ?? null,
              lng: data.location?.longitude ?? null,
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

