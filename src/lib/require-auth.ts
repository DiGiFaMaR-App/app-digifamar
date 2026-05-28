import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Use inside a route's `beforeLoad` to require an authenticated user.
 * Re-validates the session with the Auth server (not just localStorage).
 */
export async function requireAuthedUser(redirectTo: string) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw redirect({ to: "/auth", search: { tab: "signin" as const, next: redirectTo } });
  }
  return data.user;
}
