/**
 * Centralised admin authorization helper used by every admin server function.
 * Extracted so it can be unit-tested independently of the createServerFn
 * middleware chain.
 */
export async function assertAdminRole(userId: string): Promise<void> {
  if (!userId) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}
