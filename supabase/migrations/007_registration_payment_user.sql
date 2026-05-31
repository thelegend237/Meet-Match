-- ============================================================================
-- MEET & MATCH — Migration 007 : Paiement inscription utilisateur (MVP pré-Stripe)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.confirm_registration_payment()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pay public.payments%ROWTYPE;
  v_amount NUMERIC(10, 2) := 29.00;
  v_currency TEXT := 'EUR';
  v_profile public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_profile.registration_payment_status IN ('paid', 'free') THEN
    RAISE EXCEPTION 'Registration already paid';
  END IF;

  SELECT * INTO pay
  FROM public.payments
  WHERE user_id = auth.uid()
    AND type = 'registration'
    AND status = 'unpaid'
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    IF v_profile.country_code = 'CA' THEN
      v_amount := 42.00;
      v_currency := 'CAD';
    ELSIF v_profile.country_code = 'US' THEN
      v_amount := 32.00;
      v_currency := 'USD';
    END IF;

    INSERT INTO public.payments (user_id, type, amount, currency, status, provider)
    VALUES (auth.uid(), 'registration', v_amount, v_currency, 'unpaid', 'manual')
    RETURNING * INTO pay;
  END IF;

  UPDATE public.payments
  SET
    status = 'paid',
    provider = 'manual',
    updated_at = NOW()
  WHERE id = pay.id;

  RETURN pay.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_registration_payment TO authenticated;
