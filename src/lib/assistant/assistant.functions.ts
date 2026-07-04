/**
 * AI Farmer Assistant — server-function controller.
 *
 * Authenticated via requireSupabaseAuth. The handler loads the caller's own
 * profile/farm context (under their RLS session) and hands it to the service,
 * so personalization can't be spoofed by the client.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { AskAssistantDto, type AssistantReply } from "./dto";
import type { AssistantUserContext } from "./service.server";

async function loadUserContext(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<AssistantUserContext> {
  const [{ data: profile, error: profileError }, { data: farm, error: farmError }] =
    await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
      supabase
        .from("farmer_profiles")
        .select("farm_name, products, city, state")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  // Personalization is best-effort: on error we fall back to defaults, but log
  // so a misconfigured RLS policy or DB issue is diagnosable rather than silent.
  if (profileError) console.error("[assistant] failed to load profile context:", profileError);
  if (farmError) console.error("[assistant] failed to load farm context:", farmError);

  const location = farm ? [farm.city, farm.state].filter(Boolean).join(", ") || null : null;

  return {
    fullName: profile?.full_name ?? null,
    role: farm ? "farmer" : "buyer",
    farmName: farm?.farm_name ?? null,
    products: farm?.products ?? [],
    location,
  };
}

export const askAssistantFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AskAssistantDto.parse(input))
  .handler(async ({ data, context }): Promise<AssistantReply> => {
    const user = await loadUserContext(
      context.supabase as SupabaseClient<Database>,
      context.userId,
    );
    const { AssistantService } = await import("./service.server");
    return AssistantService.ask({ user, messages: data.messages, context: data.context });
  });
