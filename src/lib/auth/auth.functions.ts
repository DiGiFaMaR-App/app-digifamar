/**
 * Auth module — server function "controllers".
 * NestJS equivalent: auth.controller.ts
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AuthService } from "./service.server";
import { SignUpDto } from "./dto";

export const signUpFn = createServerFn({ method: "POST" })
  .inputValidator((input) => SignUpDto.parse(input))
  .handler(({ data }) => AuthService.signUp(data));

export const getMeFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(({ context }) => AuthService.getMe(context.userId));
