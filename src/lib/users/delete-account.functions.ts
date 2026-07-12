/**
 * Delete-account — CLIENT module (self-contained app).
 *
 * Calls the `delete-account` Supabase Edge Function (service role wipes the
 * auth user + cascades). Export name/shape kept for drop-in compatibility.
 */
import { supabase } from "@/integrations/supabase/client";

export const deleteMyAccountFn = async ({
  data,
}: {
  data: { confirmation: "DELETE" };
}): Promise<{ ok: true }> => {
  const { data: res, error } = await supabase.functions.invoke("delete-account", {
    body: { confirmation: data.confirmation },
  });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      const j = await ctx.json().catch(() => null);
      if (j?.error) throw new Error(j.error);
    }
    throw new Error(error.message);
  }
  if (res && typeof res === "object" && "error" in res) {
    throw new Error((res as { error: string }).error);
  }
  return { ok: true };
};
