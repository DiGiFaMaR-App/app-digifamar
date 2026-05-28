/**
 * Users module — DTOs.
 * NestJS equivalent: users.dto.ts
 */
import { z } from "zod";

export const UpdateProfileDto = z.object({
  fullName: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().max(32).optional(),
  avatarUrl: z.string().url().max(2048).optional(),
});
export type UpdateProfileDto = z.infer<typeof UpdateProfileDto>;

export const UserProfileDto = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
  fullName: z.string().nullable(),
  phone: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});
export type UserProfileDto = z.infer<typeof UserProfileDto>;
