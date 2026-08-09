CREATE OR REPLACE FUNCTION public.notify_farmer_on_kyc_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','rejected') THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.user_id,
      'kyc_document',
      'Document ' || NEW.status,
      COALESCE(
        NEW.review_notes,
        'Your ' || replace(NEW.doc_type, '_', ' ') || ' was ' || NEW.status || '.'
      ),
      jsonb_build_object('document_id', NEW.id, 'doc_type', NEW.doc_type, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_farmer_on_kyc_review() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_kyc_review_notify ON public.farmer_kyc_documents;
CREATE TRIGGER trg_kyc_review_notify
AFTER UPDATE ON public.farmer_kyc_documents
FOR EACH ROW EXECUTE FUNCTION public.notify_farmer_on_kyc_review();