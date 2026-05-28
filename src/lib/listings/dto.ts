/**
 * Listings module — DTOs.
 * NestJS equivalent: listings.dto.ts
 *
 * Listings currently live in the mock catalog (`src/lib/mock-data.ts`); when
 * a `listings` table is added these DTOs will map 1:1 to its columns.
 */
import { z } from "zod";

export const CreateListingDto = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(1).max(64),
  price: z.number().positive().max(1_000_000),
  unit: z.string().trim().min(1).max(32),
  stock: z.number().int().nonnegative().max(1_000_000),
  description: z.string().trim().max(2_000).optional(),
});
export type CreateListingDto = z.infer<typeof CreateListingDto>;

export const UpdateListingDto = CreateListingDto.partial();
export type UpdateListingDto = z.infer<typeof UpdateListingDto>;

export const ListingQueryDto = z.object({
  category: z.string().trim().max(64).optional(),
  search: z.string().trim().max(120).optional(),
  limit: z.number().int().min(1).max(100).default(24),
  offset: z.number().int().nonnegative().default(0),
});
export type ListingQueryDto = z.infer<typeof ListingQueryDto>;

export const ListingDto = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  price: z.number(),
  unit: z.string(),
  stock: z.number(),
  description: z.string().nullable(),
  farmerId: z.string().nullable(),
});
export type ListingDto = z.infer<typeof ListingDto>;
