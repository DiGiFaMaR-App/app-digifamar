-- Lender portal: precomputed farmer recommendations surfaced to lenders in
-- /lenders/dashboard, ranked by the DiGiFaMaR Trade Score. A row with a NULL
-- lender_id is a global recommendation visible to every approved lender;
-- a row with a lender_id is targeted to that institution.

CREATE TABLE public.farmer_lender_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_score INTEGER NOT NULL DEFAULT 0,         -- 0-100 DiGiFaMaR Trade Score
  twelve_month_sales NUMERIC NOT NULL DEFAULT 0,
  repeat_buyer_pct NUMERIC NOT NULL DEFAULT 0,
  avg_rating NUMERIC NOT NULL DEFAULT 0,
  recommended_amount NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT recommendations_trade_score_chk CHECK (trade_score BETWEEN 0 AND 100),
  CONSTRAINT recommendations_farmer_lender_uniq UNIQUE (farmer_id, lender_id)
);

CREATE INDEX recommendations_lender_score_idx
  ON public.farmer_lender_recommendations (lender_id, trade_score DESC);

GRANT SELECT ON public.farmer_lender_recommendations TO authenticated;
GRANT ALL ON public.farmer_lender_recommendations TO service_role;

ALTER TABLE public.farmer_lender_recommendations ENABLE ROW LEVEL SECURITY;

-- Approved lenders see global recommendations plus any targeted to them.
-- Admins see everything.
CREATE POLICY "Lenders read their recommendations"
  ON public.farmer_lender_recommendations FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.has_role(auth.uid(), 'lender')
      AND (lender_id IS NULL OR lender_id = auth.uid())
    )
  );
