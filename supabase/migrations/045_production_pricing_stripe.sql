-- ============================================================================
-- MEET & MATCH — Migration 045 : Tarifs réels inscription (sortie phase test)
-- ============================================================================
-- Remplace le montant 0 $ / statut free de la migration 043.
-- En phase test app (NEXT_PUBLIC_PRICING_TEST_MODE=true), l'UI n'appelle
-- toujours pas Stripe et peut utiliser confirm_registration_payment en free.

CREATE OR REPLACE FUNCTION public.confirm_registration_payment()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pay public.payments%ROWTYPE;
  v_amount NUMERIC(10, 2) := 42.00;
  v_currency TEXT := 'CAD';
  v_final_status public.payment_status := 'paid';
  v_profile public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_profile.registration_payment_status IN ('paid', 'free') THEN
    RAISE EXCEPTION 'Registration already paid';
  END IF;

  IF v_profile.country_code = 'US' THEN
    v_amount := 32.00;
    v_currency := 'USD';
  END IF;

  SELECT * INTO pay
  FROM public.payments
  WHERE user_id = auth.uid()
    AND type = 'registration'
    AND status IN ('unpaid', 'failed')
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.payments (user_id, type, amount, currency, status, provider)
    VALUES (auth.uid(), 'registration', v_amount, v_currency, 'unpaid', 'manual')
    RETURNING * INTO pay;
  END IF;

  UPDATE public.payments
  SET
    amount = v_amount,
    currency = v_currency,
    status = v_final_status,
    provider = COALESCE(NULLIF(provider, ''), 'manual'),
    updated_at = NOW()
  WHERE id = pay.id;

  RETURN pay.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_registration_payment() TO authenticated;

-- Marque un paiement comme payé après confirmation Stripe (service role / webhook).
CREATE OR REPLACE FUNCTION public.mark_payment_paid_from_stripe(
  p_payment_id UUID,
  p_stripe_session_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  pay public.payments%ROWTYPE;
BEGIN
  SELECT * INTO pay FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF pay.status IN ('paid', 'free') THEN
    RETURN;
  END IF;

  UPDATE public.payments
  SET
    status = 'paid',
    provider = 'stripe',
    stripe_session_id = p_stripe_session_id,
    updated_at = NOW()
  WHERE id = pay.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_payment_paid_from_stripe(UUID, TEXT) TO service_role;

-- Permettre au membre de rattacher une session Stripe à son paiement impayé.
DROP POLICY IF EXISTS "payments_update_own_unpaid" ON public.payments;
CREATE POLICY "payments_update_own_unpaid"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND status IN ('unpaid', 'failed')
  )
  WITH CHECK (
    user_id = auth.uid()
  );

