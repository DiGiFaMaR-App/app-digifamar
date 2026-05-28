/**
 * Listings module — server function "controllers".
 * NestJS equivalent: listings.controller.ts
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ListingsService } from "./service.server";
import { CreateListingDto, ListingQueryDto, UpdateListingDto } from "./dto";

export const listListingsFn = createServerFn({ method: "GET" })
  .inputValidator((input) => ListingQueryDto.parse(input ?? {}))
  .handler(({ data }) => ListingsService.list(data));

export const getListingFn = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ id: z.string().min(1) }).parse(input))
  .handler(({ data }) => ListingsService.findById(data.id));

export const createListingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CreateListingDto.parse(input))
  .handler(({ data, context }) => ListingsService.create(context.userId, data));

export const updateListingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().min(1), patch: UpdateListingDto }).parse(input),
  )
  .handler(({ data }) => ListingsService.update(data.id, data.patch));

export const deleteListingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().min(1) }).parse(input))
  .handler(({ data }) => {
    ListingsService.remove(data.id);
    return { ok: true as const };
  });
