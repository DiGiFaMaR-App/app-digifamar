# Backend Modules (NestJS-style on TanStack Start)

This project's "backend" is implemented as TanStack Start server functions
(`createServerFn`) organized to mirror a NestJS module layout. Each module is a
folder under `src/lib/` containing three files:

| File                    | NestJS analogue          | Runs on            |
| ----------------------- | ------------------------ | ------------------ |
| `dto.ts`                | `*.dto.ts` (Zod schemas) | client + server    |
| `service.server.ts`     | `*.service.ts`           | server only        |
| `<module>.functions.ts` | `*.controller.ts`        | server (RPC entry) |

Modules:

- `auth/` — sign-up, current user (`getMeFn`)
- `users/` — profile read/update
- `listings/` — marketplace catalog CRUD (currently backed by mock data)
- `orders/` — order lifecycle (`pending → paid → in_escrow → ... → released`)
- `escrow/` — held / released / refunded / disputed funds
- `chat/` — thread-scoped messaging

## Why not real NestJS?

This project deploys to Cloudflare Workers via TanStack Start, which has no
long-running Node process and no direct Postgres socket — NestJS + Prisma can
neither boot nor connect from here. The shape above keeps the same separation
of concerns (DTOs / services / controllers) while staying compatible with the
Worker runtime and Lovable Cloud (Supabase) access patterns.

## Calling from the UI

```ts
import { useServerFn } from "@tanstack/react-start";
import { listListingsFn } from "@/lib/listings/listings.functions";

const list = useServerFn(listListingsFn);
const { items } = await list({ data: { limit: 24, offset: 0 } });
```

Protected endpoints (`requireSupabaseAuth` middleware) automatically receive
the user's bearer token via the global `attachSupabaseAuth` middleware wired
in `src/start.ts`.
