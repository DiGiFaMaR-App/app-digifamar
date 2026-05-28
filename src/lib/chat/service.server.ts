/**
 * Chat module — server-side service.
 * NestJS equivalent: chat.service.ts
 */
import type { ChatMessageDto, SendMessageDto, ThreadQueryDto } from "./dto";

const threads = new Map<string, ChatMessageDto[]>();

export class ChatService {
  static send(authorId: string, input: SendMessageDto): ChatMessageDto {
    const msg: ChatMessageDto = {
      id: `msg_${crypto.randomUUID()}`,
      threadId: input.threadId,
      authorId,
      body: input.body,
      createdAt: new Date().toISOString(),
    };
    const existing = threads.get(input.threadId) ?? [];
    existing.push(msg);
    threads.set(input.threadId, existing);
    return msg;
  }

  static list(query: ThreadQueryDto): ChatMessageDto[] {
    const all = threads.get(query.threadId) ?? [];
    return all.slice(-query.limit);
  }
}
