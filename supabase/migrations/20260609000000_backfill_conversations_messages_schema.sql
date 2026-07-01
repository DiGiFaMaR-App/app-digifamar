-- Backfill: version-control the `conversations` and `messages` table definitions.
--
-- These two tables were originally created outside tracked migrations (via the
-- Lovable / Supabase dashboard), yet later migrations ALTER them, add triggers,
-- policies and realtime rules, and enable RLS. That made a from-scratch
-- `supabase db reset` impossible. This migration reconstructs their structure
-- from the generated schema in src/integrations/supabase/types.ts.
--
-- It is dated before the first migration that references either table
-- (20260609215451, the realtime authorization policy) so a fresh rebuild creates
-- the tables before anything touches them. Every statement uses IF NOT EXISTS,
-- so on the already-deployed database (where the tables exist) this is a no-op.
--
-- Scope note: only the table STRUCTURE (columns, keys, grants, RLS enablement)
-- is backfilled here. The baseline participant RLS policies for these tables are
-- still managed outside migrations; reconstructing their exact original
-- definitions was out of scope and is unnecessary for the deployed DB.
--
-- Reconstructed from types.ts rather than a live pg_dump because a database
-- password was not available in this environment; columns/nullability/defaults
-- mirror the generated types exactly.

-- conversations -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id         UUID NOT NULL,
  farmer_id        UUID NOT NULL,
  product_id       UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- messages ------------------------------------------------------------------
-- Note: the `flagged` column is intentionally omitted here; it is added by a
-- later migration (20260613131158) via ALTER TABLE ... ADD COLUMN IF NOT EXISTS,
-- preserving the historical order.
CREATE TABLE IF NOT EXISTS public.messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL
    REFERENCES public.conversations (id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL,
  body             TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_id_idx
  ON public.messages (conversation_id, created_at);

GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
