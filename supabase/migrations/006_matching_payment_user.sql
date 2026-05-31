-- ============================================================================
-- MEET & MATCH — Migration 006 : Paiement matching utilisateur (MVP pré-Stripe)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.confirm_matching_payment(p_payment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pay public.payments%ROWTYPE;
BEGIN
  SELECT * INTO pay FROM public.payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF pay.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF pay.type != 'matching' THEN
    RAISE EXCEPTION 'Invalid payment type';
  END IF;

  IF pay.status != 'unpaid' THEN
    RAISE EXCEPTION 'Payment already processed';
  END IF;

  UPDATE public.payments
  SET
    status = 'paid',
    provider = 'manual',
    updated_at = NOW()
  WHERE id = p_payment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_matching_payment TO authenticated;
