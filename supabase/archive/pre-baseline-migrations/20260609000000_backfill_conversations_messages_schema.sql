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
-- Baseline participant RLS policies are also recreated so a fresh reset yields
-- functional (not access-blocked) tables. They are created ONLY when the table
-- has no policies yet: on a fresh reset that is true at this point in history,
-- so the baseline policies are installed; on the already-deployed DB the tables
-- already have their (later, stricter) policies, so the guard skips creation and
-- nothing is loosened. The conversations INSERT policy is named
-- "Participants create conversations" to match the name that later migrations
-- (20260614113626) drop and replace with the stricter verified-farmer version.
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

-- Participant lookups filter on buyer_id / farmer_id (also used by the RLS
-- USING clause). The messages table's own index is defined below.
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_farmer
  ON public.conversations (buyer_id, farmer_id);

-- Baseline conversations policies (only if none exist yet — i.e. fresh reset).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'conversations'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Participants view their conversations"
        ON public.conversations FOR SELECT TO authenticated
        USING (auth.uid() = buyer_id OR auth.uid() = farmer_id)
    $p$;
    EXECUTE $p$
      CREATE POLICY "Participants create conversations"
        ON public.conversations FOR INSERT TO authenticated
        WITH CHECK (auth.uid() = buyer_id OR auth.uid() = farmer_id)
    $p$;
  END IF;
END $$;

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

-- Baseline messages policies (only if none exist yet — i.e. fresh reset).
-- A user may read/send messages only in conversations they participate in.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Participants view messages in their conversations"
        ON public.messages FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
              AND (c.buyer_id = auth.uid() OR c.farmer_id = auth.uid())
          )
        )
    $p$;
    EXECUTE $p$
      CREATE POLICY "Participants send messages in their conversations"
        ON public.messages FOR INSERT TO authenticated
        WITH CHECK (
          sender_id = auth.uid()
          AND EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
              AND (c.buyer_id = auth.uid() OR c.farmer_id = auth.uid())
          )
        )
    $p$;
  END IF;
END $$;
