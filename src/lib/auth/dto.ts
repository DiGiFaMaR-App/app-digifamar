/**
 * Auth module — DTOs (client-safe).
 * NestJS equivalent: auth.dto.ts
 */
import { z } from "zod";

export const SignUpDto = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  role: z.enum(["buyer", "farmer"]),
  fullName: z.string().trim().min(1).max(100),
});
export type SignUpDto = z.infer<typeof SignUpDto>;

export const SignInDto = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(128),
});
export type SignInDto = z.infer<typeof SignInDto>;

export const AuthUserDto = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
  role: z.enum(["buyer", "farmer", "admin"]).nullable(),
  fullName: z.string().nullable(),
});
export type AuthUserDto = z.infer<typeof AuthUserDto>;
