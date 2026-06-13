
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.guard_message_contact_info()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  b TEXT := lower(NEW.body);
BEGIN
  -- emails
  IF b ~ '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' THEN
    RAISE EXCEPTION 'CONTACT_INFO_BLOCKED: emails are not allowed in chat to keep escrow protection.' USING ERRCODE = 'P0001';
  END IF;
  -- phone numbers (7+ digits, allowing spaces/dashes/dots/parens/+)
  IF b ~ '(\+?\d[\d\s().-]{6,}\d)' THEN
    RAISE EXCEPTION 'CONTACT_INFO_BLOCKED: phone numbers are not allowed in chat to keep escrow protection.' USING ERRCODE = 'P0001';
  END IF;
  -- off-platform handles/services
  IF b ~ '(whats\s*app|telegram|signal\b|wechat|viber|kakao|line\b|messenger|instagram|ig\s+dm|snap\s*chat|discord|skype|facetime|imessage|cash\s*app|venmo|zelle|paypal|bitcoin|btc\b|crypto)' THEN
    RAISE EXCEPTION 'CONTACT_INFO_BLOCKED: off-platform contact or payment methods are not allowed. Escrow only works inside the app.' USING ERRCODE = 'P0001';
  END IF;
  -- "let's talk off-platform" patterns
  IF b ~ '(call\s+me|text\s+me|reach\s+me\s+at|dm\s+me|email\s+me|hit\s+me\s+up|outside\s+the\s+app|off\s*-?\s*platform|off\s+the\s+site|my\s+number|my\s+phone|my\s+email)' THEN
    RAISE EXCEPTION 'CONTACT_INFO_BLOCKED: off-platform contact requests are not allowed. Escrow only works inside the app.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.guard_message_contact_info() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_messages_contact_guard ON public.messages;
CREATE TRIGGER trg_messages_contact_guard BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_message_contact_info();

-- Admin oversight: read all user_roles
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
