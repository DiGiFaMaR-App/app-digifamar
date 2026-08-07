import { supabase } from "@/integrations/supabase/client";
import { captureEvent } from "./posthog";

export type WhatsAppClickSource = "fab" | "footer" | "contact" | "app_shell";

/**
 * Record a WhatsApp chat start. Fire-and-forget on both sinks:
 * PostHog for funnels/journeys, our own table for owned data.
 */
export function trackWhatsAppClick(source: WhatsAppClickSource) {
  if (typeof window === "undefined") return;

  const path = window.location.pathname + window.location.search;
  const referrer = document.referrer || null;

  captureEvent("whatsapp_chat_started", { source, path, referrer });

  void (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      await supabase.from("whatsapp_click_events").insert({
        source,
        path: path.slice(0, 500),
        referrer: referrer ? referrer.slice(0, 500) : null,
        user_id: data.session?.user.id ?? null,
      });
    } catch {
      // Analytics must never break the chat hand-off.
    }
  })();
}
