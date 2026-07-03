/**
 * AI Farmer Assistant — DTOs.
 *
 * The client sends the running chat transcript (user/assistant turns) plus an
 * optional short free-text `context` (e.g. the listing or negotiation the user
 * is looking at). The server enriches this with the caller's profile/farm data
 * before calling Anthropic — the client never sends personalization it could
 * forge, and never sees the API key.
 */
import { z } from "zod";

export const AssistantChatRole = z.enum(["user", "assistant"]);
export type AssistantChatRole = z.infer<typeof AssistantChatRole>;

export const AssistantMessageDto = z.object({
  role: AssistantChatRole,
  content: z.string().trim().min(1).max(4000),
});
export type AssistantMessageDto = z.infer<typeof AssistantMessageDto>;

export const AskAssistantDto = z.object({
  messages: z.array(AssistantMessageDto).min(1).max(24),
  /** Optional UI context, e.g. "Negotiating listing: Heirloom Tomatoes at $4.20/lb". */
  context: z.string().trim().max(1000).optional(),
});
export type AskAssistantDto = z.infer<typeof AskAssistantDto>;

export type AssistantReply = {
  reply: string;
  /** true when the assistant ran without a configured provider (fallback text). */
  degraded: boolean;
};
