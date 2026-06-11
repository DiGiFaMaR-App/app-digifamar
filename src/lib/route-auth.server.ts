// Bearer-token verification helper for raw server route handlers.
// Use this when you cannot use the `requireSupabaseAuth` function middleware
// (e.g. inside `createFileRoute({ server: { handlers } })`).
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type AuthedUser = { userId: string };

export async function authenticateRequest(
  request: Request,
): Promise<{ ok: true; user: AuthedUser } | { ok: false; status: 401; error: string }> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return { ok: false, status: 401, error: "Auth not configured" };
  }
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Missing bearer token" };
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token) return { ok: false, status: 401, error: "Missing bearer token" };

  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    return { ok: false, status: 401, error: "Invalid or expired token" };
  }
  return { ok: true, user: { userId: data.claims.sub } };
}
