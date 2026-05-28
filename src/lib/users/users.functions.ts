/**
 * Users module — server function "controllers".
 * NestJS equivalent: users.controller.ts
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { UsersService } from "./service.server";
import { UpdateProfileDto } from "./dto";

export const getMyProfileFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(({ context }) => UsersService.findById(context.userId));

export const updateMyProfileFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => UpdateProfileDto.parse(input))
  .handler(({ data, context }) => UsersService.updateProfile(context.userId, data));
