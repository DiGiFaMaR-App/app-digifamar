import { supabase } from "@/integrations/supabase/client";

export interface SendAppEmailInput {
  templateName: "welcome" | "farm-onboarding-status" | "order-confirmation";
  recipientEmail: string;
  /** Derived from the triggering event so retries never duplicate a send. */
  idempotencyKey: string;
  templateData?: Record<string, unknown>;
}

/**
 * Queue a branded DiGiFaMaR app email.
 *
 * Fail-soft by design: notification delivery must never block or fail the
 * user-facing action (signup, onboarding, checkout) that triggered it.
 */
export async function sendAppEmail(input: SendAppEmailInput): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return false;

    const res = await fetch("/lovable/email/transactional/send", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    });
    return res.ok;
  } catch {
    return false;
  }
}
