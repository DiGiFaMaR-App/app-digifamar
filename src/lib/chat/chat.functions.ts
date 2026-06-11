/**
 * Chat module — server function "controllers".
 * NestJS equivalent: chat.controller.ts
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ChatService } from "./service.server";
import { SendMessageDto, ThreadQueryDto } from "./dto";

export const sendMessageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SendMessageDto.parse(input))
  .handler(({ data, context }) => ChatService.send(context.userId, data));

export const listMessagesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ThreadQueryDto.parse(input))
  .handler(({ data, context }) => ChatService.list(context.userId, data));
