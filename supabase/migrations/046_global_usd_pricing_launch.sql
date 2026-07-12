-- ============================================================================
-- MEET & MATCH — Migration 046 : Tarifs mondiaux 5 $ / 10 $ USD
-- ============================================================================
-- Inscription : 5 USD (ou complimentary = free / 0 $)
-- Matching : défaut propose_match 10 USD
-- Stripe charge toujours en USD côté app ; les devises locales sont affichage uniquement.

-- Remplace l'ancienne signature sans argument (évite double surcharge).
DROP FUNCTION IF EXISTS public.confirm_registration_payment();

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
    provider = COALESCE(NULLIF(provider, ''), 'manual'),
    updated_at = NOW()
  WHERE id = pay.id;

  RETURN pay.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_registration_payment(BOOLEAN) TO authenticated;

-- Defaults matching : 10 USD (corps = migration 029, seuls les défauts changent)
CREATE OR REPLACE FUNCTION public.propose_match(
  p_admin_id UUID,
  p_user_a_id UUID,
  p_user_b_id UUID,
  p_amount DECIMAL DEFAULT 10.00,
  p_currency CHAR(3) DEFAULT 'USD'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  ordered_a UUID;
  ordered_b UUID;
  v_match_id UUID;
  admin_ok BOOLEAN;
  v_name_a TEXT;
  v_name_b TEXT;
  v_role_a public.user_role;
  v_role_b public.user_role;
  v_status_a public.payment_status;
  v_status_b public.payment_status;
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

  SELECT role INTO v_role_a FROM public.profiles WHERE id = ordered_a;
  SELECT role INTO v_role_b FROM public.profiles WHERE id = ordered_b;

  IF v_role_a IS NULL OR v_role_b IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_role_a != 'user' OR v_role_b != 'user' THEN
    RAISE EXCEPTION 'Cannot match staff accounts with members';
  END IF;

  INSERT INTO public.matches (user_a_id, user_b_id, status, proposed_by)
  VALUES (ordered_a, ordered_b, 'pending_payment', p_admin_id)
  RETURNING id INTO v_match_id;

  v_status_a := public.create_matching_payment_for_user(ordered_a, v_match_id, p_amount, p_currency);
  v_status_b := public.create_matching_payment_for_user(ordered_b, v_match_id, p_amount, p_currency);

  PERFORM public.create_notification(
    ordered_a, 'match_proposed', 'Match proposé',
    'Un administrateur vous propose un match.',
    jsonb_build_object('match_id', v_match_id)
  );
  PERFORM public.create_notification(
    ordered_b, 'match_proposed', 'Match proposé',
    'Un administrateur vous propose un match.',
    jsonb_build_object('match_id', v_match_id)
  );

  IF v_status_a = 'unpaid' THEN
    PERFORM public.create_notification(
      ordered_a, 'matching_payment_required', 'Paiement requis',
      'Votre mise en relation est prête. Payez les frais de matching pour continuer.',
      jsonb_build_object('match_id', v_match_id)
    );
  ELSE
    PERFORM public.create_notification(
      ordered_a, 'matching_payment_required', 'Match inclus',
      'Ce match est couvert par votre forfait mensuel (crédit gratuit utilisé).',
      jsonb_build_object('match_id', v_match_id, 'covered_by_credit', true)
    );
  END IF;

  IF v_status_b = 'unpaid' THEN
    PERFORM public.create_notification(
      ordered_b, 'matching_payment_required', 'Paiement requis',
      'Votre mise en relation est prête. Payez les frais de matching pour continuer.',
      jsonb_build_object('match_id', v_match_id)
    );
  ELSE
    PERFORM public.create_notification(
      ordered_b, 'matching_payment_required', 'Match inclus',
      'Ce match est couvert par votre forfait mensuel (crédit gratuit utilisé).',
      jsonb_build_object('match_id', v_match_id, 'covered_by_credit', true)
    );
  END IF;

  SELECT display_name INTO v_name_a FROM public.profiles WHERE id = ordered_a;
  SELECT display_name INTO v_name_b FROM public.profiles WHERE id = ordered_b;

  PERFORM public.notify_active_admins(
    'admin_match_pending',
    'Match proposé — paiements en attente',
    COALESCE(v_name_a, 'Membre') || ' et ' || COALESCE(v_name_b, 'Membre')
      || ' — statuts paiement : '
      || CASE WHEN v_status_a = 'free' THEN 'gratuit (A)' ELSE 'à payer (A)' END
      || ' / '
      || CASE WHEN v_status_b = 'free' THEN 'gratuit (B)' ELSE 'à payer (B)' END,
    jsonb_build_object(
      'match_id', v_match_id,
      'payment_status_a', v_status_a,
      'payment_status_b', v_status_b
    )
  );

  PERFORM public.log_admin_action(
    p_admin_id, 'propose_match', 'match', v_match_id,
    jsonb_build_object(
      'user_a', ordered_a,
      'user_b', ordered_b,
      'payment_status_a', v_status_a,
      'payment_status_b', v_status_b
    )
  );

  PERFORM public.check_match_payment_status(v_match_id);

  RETURN v_match_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.propose_match(UUID, UUID, UUID, DECIMAL, CHAR) TO authenticated;
