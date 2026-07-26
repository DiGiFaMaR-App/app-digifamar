// Shared CORS headers + helpers for DiGiFaMaR Edge Functions.
//
// The self-contained Capacitor app calls these functions from a WebView whose
// origin is https://app.digifamar.com (see capacitor.config.ts). Supabase's
// functions.invoke sends the user's JWT in the Authorization header, so each
// function can identify the caller and enforce authorization itself.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}
