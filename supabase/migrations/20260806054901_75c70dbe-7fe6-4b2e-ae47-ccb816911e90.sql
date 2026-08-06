CREATE TABLE IF NOT EXISTS public.phone_otps (
  phone text PRIMARY KEY,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  verified_at timestamptz,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.phone_otps TO service_role;
ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.otp_send_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  phone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.otp_send_events TO service_role;
ALTER TABLE public.otp_send_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_otp_send_events_ip_created ON public.otp_send_events (ip, created_at);
CREATE INDEX IF NOT EXISTS idx_otp_send_events_created ON public.otp_send_events (created_at);

ALTER TABLE public.farmer_profiles
  ADD COLUMN IF NOT EXISTS farm_type text,
  ADD COLUMN IF NOT EXISTS usda_number text;