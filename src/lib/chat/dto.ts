/**
 * Chat module — DTOs.
 * NestJS equivalent: chat.dto.ts
 */
import { z } from "zod";

export const SendMessageDto = z.object({
  threadId: z.string().min(1).max(64),
  body: z.string().trim().min(1).max(2_000),
});
export type SendMessageDto = z.infer<typeof SendMessageDto>;

export const ChatMessageDto = z.object({
  id: z.string(),
  threadId: z.string(),
  authorId: z.string(),
  body: z.string(),
  createdAt: z.string(),
});
export type ChatMessageDto = z.infer<typeof ChatMessageDto>;

export const ThreadQueryDto = z.object({
  threadId: z.string().min(1).max(64),
  limit: z.number().int().min(1).max(200).default(50),
});
export type ThreadQueryDto = z.infer<typeof ThreadQueryDto>;
