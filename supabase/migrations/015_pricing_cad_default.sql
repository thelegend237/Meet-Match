-- ============================================================================
-- MEET & MATCH — Migration 015 : Devise par défaut CAD (au lieu de EUR)
-- ============================================================================

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
    IF v_profile.country_code = 'US' THEN
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

CREATE OR REPLACE FUNCTION public.propose_match(
  p_admin_id UUID,
  p_user_a_id UUID,
  p_user_b_id UUID,
  p_amount DECIMAL DEFAULT 72.00,
  p_currency CHAR(3) DEFAULT 'CAD'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ordered_a UUID;
  ordered_b UUID;
  v_match_id UUID;
  admin_ok BOOLEAN;
BEGIN
  SELECT public.is_admin() INTO admin_ok;
  IF NOT admin_ok AND auth.uid() != p_admin_id THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  IF p_user_a_id < p_user_b_id THEN
    ordered_a := p_user_a_id;
    ordered_b := p_user_b_id;
  ELSE
    ordered_a := p_user_b_id;
    ordered_b := p_user_a_id;
  END IF;

  IF ordered_a = ordered_b THEN
    RAISE EXCEPTION 'Cannot match user with themselves';
  END IF;

  INSERT INTO public.matches (user_a_id, user_b_id, status, proposed_by)
  VALUES (ordered_a, ordered_b, 'pending_payment', p_admin_id)
  RETURNING id INTO v_match_id;

  INSERT INTO public.payments (user_id, match_id, type, amount, currency, status)
  VALUES
    (ordered_a, v_match_id, 'matching', p_amount, p_currency, 'unpaid'),
    (ordered_b, v_match_id, 'matching', p_amount, p_currency, 'unpaid');

  PERFORM public.create_notification(
    ordered_a,
    'match_proposed',
    'Match proposé',
    'Un administrateur vous propose un match.',
    jsonb_build_object('match_id', v_match_id)
  );
  PERFORM public.create_notification(
    ordered_b,
    'match_proposed',
    'Match proposé',
    'Un administrateur vous propose un match.',
    jsonb_build_object('match_id', v_match_id)
  );
  PERFORM public.create_notification(
    ordered_a,
    'matching_payment_required',
    'Paiement requis',
    'Votre mise en relation est prête. Payez les frais de matching pour continuer.',
    jsonb_build_object('match_id', v_match_id)
  );
  PERFORM public.create_notification(
    ordered_b,
    'matching_payment_required',
    'Paiement requis',
    'Votre mise en relation est prête. Payez les frais de matching pour continuer.',
    jsonb_build_object('match_id', v_match_id)
  );

  PERFORM public.log_admin_action(
    p_admin_id,
    'propose_match',
    'match',
    v_match_id,
    jsonb_build_object('user_a', ordered_a, 'user_b', ordered_b)
  );

  RETURN v_match_id;
END;
$$;
