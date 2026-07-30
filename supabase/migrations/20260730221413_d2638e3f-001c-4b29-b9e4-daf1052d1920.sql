CREATE TABLE public.dispute_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  author_id uuid,
  author_role text NOT NULL DEFAULT 'system',
  kind text NOT NULL DEFAULT 'comment',
  body text,
  evidence_urls text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX dispute_events_dispute_idx ON public.dispute_events(dispute_id, created_at);
CREATE INDEX dispute_events_order_idx ON public.dispute_events(order_id, created_at);

GRANT SELECT, INSERT ON public.dispute_events TO authenticated;
GRANT ALL ON public.dispute_events TO service_role;

ALTER TABLE public.dispute_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view dispute events" ON public.dispute_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = dispute_events.order_id
            AND (o.buyer_id = auth.uid() OR o.farmer_id = auth.uid()))
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Participants add dispute events" ON public.dispute_events
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM public.orders o WHERE o.id = dispute_events.order_id
              AND (o.buyer_id = auth.uid() OR o.farmer_id = auth.uid()))
      OR public.has_role(auth.uid(), 'admin')
    )
  );