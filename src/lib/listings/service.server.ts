/**
 * Listings module — server-side service.
 * NestJS equivalent: listings.service.ts
 *
 * Backed by the in-memory mock catalog until a `listings` table exists.
 */
import { products } from "@/lib/mock-data";
import type { CreateListingDto, ListingDto, ListingQueryDto, UpdateListingDto } from "./dto";

const store = new Map<string, ListingDto>(
  products.map((p) => [
    p.id,
    {
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      unit: p.unit,
      stock: 100,
      description: null,
      farmerId: null,
    },
  ]),
);

export class ListingsService {
  static list(query: ListingQueryDto): { items: ListingDto[]; total: number } {
    let items = Array.from(store.values());
    if (query.category) items = items.filter((l) => l.category === query.category);
    if (query.search) {
      const q = query.search.toLowerCase();
      items = items.filter((l) => l.name.toLowerCase().includes(q));
    }
    const total = items.length;
    return { items: items.slice(query.offset, query.offset + query.limit), total };
  }

  static findById(id: string): ListingDto | null {
    return store.get(id) ?? null;
  }

  static create(farmerId: string, input: CreateListingDto): ListingDto {
    const listing: ListingDto = {
      id: `lst_${crypto.randomUUID()}`,
      farmerId,
      description: input.description ?? null,
      ...input,
    };
    store.set(listing.id, listing);
    return listing;
  }

  static update(id: string, patch: UpdateListingDto): ListingDto {
    const existing = store.get(id);
    if (!existing) throw new Error(`Listing ${id} not found`);
    const next: ListingDto = { ...existing, ...patch };
    store.set(id, next);
    return next;
  }

  static remove(id: string): void {
    store.delete(id);
  }
}
