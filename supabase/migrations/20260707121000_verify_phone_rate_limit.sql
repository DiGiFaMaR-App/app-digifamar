-- Anti-toll-fraud backstop for the unauthenticated verify-phone function.
-- The per-phone 60s cooldown only limits repeat sends to the SAME number; it
-- does nothing against SMS-pumping across many attacker-controlled numbers.
-- This append-only log lets verify-phone enforce a per-IP and a global hourly
-- ceiling on outbound SMS. Service-role only (the function writes it).

CREATE TABLE IF NOT EXISTS public.otp_send_events (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip         TEXT,
  phone      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS otp_send_events_created_idx    ON public.otp_send_events (created_at);
CREATE INDEX IF NOT EXISTS otp_send_events_ip_created_idx ON public.otp_send_events (ip, created_at);

ALTER TABLE public.otp_send_events ENABLE ROW LEVEL SECURITY;
-- No policies + no grants => only service_role (the verify-phone function) may touch it.
REVOKE ALL ON public.otp_send_events FROM anon, authenticated;
GRANT ALL ON public.otp_send_events TO service_role;
