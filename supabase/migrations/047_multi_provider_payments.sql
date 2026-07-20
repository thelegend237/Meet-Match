-- ============================================================================
-- MEET & MATCH — Migration 047 : Multi-provider (PayPal + CinetPay)
-- ============================================================================
-- Ajoute paypal à l'enum payment_provider et une RPC générique
-- mark_payment_paid utilisée par tous les webhooks (Stripe / PayPal / CinetPay).
-- Corrige aussi confirm_registration_payment : NULLIF(provider, '') cassait
-- l'enum (invalid input value for enum payment_provider: "").

ALTER TYPE public.payment_provider ADD VALUE IF NOT EXISTS 'paypal';

-- Marque un paiement comme payé quel que soit le provider.
CREATE OR REPLACE FUNCTION public.mark_payment_paid(
  p_payment_id UUID,
  p_provider public.payment_provider,
  p_provider_reference TEXT
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
    provider = p_provider,
    provider_reference = COALESCE(NULLIF(p_provider_reference, ''), provider_reference),
    stripe_session_id = CASE
      WHEN p_provider = 'stripe' THEN COALESCE(NULLIF(p_provider_reference, ''), stripe_session_id)
      ELSE stripe_session_id
    END,
    updated_at = NOW()
  WHERE id = pay.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_payment_paid(UUID, public.payment_provider, TEXT) TO service_role;

-- Conserve l'ancienne RPC Stripe : délègue au générique.
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
BEGIN
  PERFORM public.mark_payment_paid(p_payment_id, 'stripe', p_stripe_session_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_payment_paid_from_stripe(UUID, TEXT) TO service_role;

-- Fix activation gratuite / complimentary (bug NULLIF enum vide).
CREATE OR REPLACE FUNCTION public.confirm_registration_payment(
  p_as_complimentary BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pay public.payments%ROWTYPE;
  v_amount NUMERIC(10, 2) := 5.00;
  v_currency TEXT := 'USD';
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

  IF p_as_complimentary THEN
    v_amount := 0.00;
    v_final_status := 'free';
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
    provider = CASE
      WHEN p_as_complimentary THEN 'manual'::public.payment_provider
      ELSE COALESCE(provider, 'manual'::public.payment_provider)
    END,
    updated_at = NOW()
  WHERE id = pay.id;

  RETURN pay.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_registration_payment(BOOLEAN) TO authenticated;
