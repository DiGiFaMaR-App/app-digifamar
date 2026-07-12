/**
 * AI Farm Assistant — CLIENT module (self-contained app).
 *
 * Calls the `assistant` Supabase Edge Function (which holds ANTHROPIC_API_KEY).
 * When the function reports it isn't configured — or the call fails — we fall
 * back to the offline deterministic engine (respondText), so the assistant
 * always answers even with no provider and no network to a server.
 */
import { supabase } from "@/integrations/supabase/client";
import { respondText } from "./engine";
import type { AskAssistantDto, AssistantReply } from "./dto";

export const askAssistantFn = async ({
  data,
}: {
  data: AskAssistantDto;
}): Promise<AssistantReply> => {
  const lastUser = [...data.messages].reverse().find((m) => m.role === "user");
  const offline = (): AssistantReply => ({
    reply: respondText(lastUser?.content ?? ""),
    degraded: true,
  });

  try {
    const { data: res, error } = await supabase.functions.invoke("assistant", {
      body: { messages: data.messages, context: data.context },
    });
    if (error) return offline();
    if (!res || res.notConfigured || res.reply == null) return offline();
    return { reply: String(res.reply), degraded: Boolean(res.degraded) };
  } catch {
    return offline();
  }
};
