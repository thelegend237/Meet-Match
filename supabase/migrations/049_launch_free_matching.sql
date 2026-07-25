-- ============================================================================
-- MEET & MATCH — Migration 049 : Matching gratuit si montant = 0
-- ============================================================================
-- Pendant l'offre de lancement (ou phase test), propose_match envoie amount=0.
-- Les paiements matching à 0 $ doivent être status 'free' immédiatement,
-- pour activer le match sans forcer un clic « payer ».

CREATE OR REPLACE FUNCTION public.create_matching_payment_for_user(
  p_user_id UUID,
  p_match_id UUID,
  p_amount DECIMAL,
  p_currency CHAR(3)
)
RETURNS public.payment_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_status public.payment_status;
  v_month DATE := public.matching_billing_month();
BEGIN
  -- Offre lancement / phase test / montant nul → gratuit
  IF COALESCE(p_amount, 0) <= 0 THEN
    v_status := 'free';
  ELSIF NOT public.user_has_ever_paid_matching(p_user_id) THEN
    v_status := 'unpaid';
  ELSIF public.matching_free_credits_remaining(p_user_id) > 0 THEN
    INSERT INTO public.matching_credit_usage (user_id, match_id, billing_month)
    VALUES (p_user_id, p_match_id, v_month);
    v_status := 'free';
  ELSE
    v_status := 'unpaid';
  END IF;

  INSERT INTO public.payments (user_id, match_id, type, amount, currency, status, provider)
  VALUES (
    p_user_id,
    p_match_id,
    'matching',
    GREATEST(COALESCE(p_amount, 0), 0),
    p_currency,
    v_status,
    CASE WHEN v_status = 'free' THEN 'manual'::public.payment_provider ELSE 'stripe'::public.payment_provider END
  );

  RETURN v_status;
END;
$$;

-- Notifications plus claires quand le match est gratuit (montant 0)
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

  SELECT role INTO v_role_a FROM public.profiles WHERE id = ordered_a;
  SELECT role INTO v_role_b FROM public.profiles WHERE id = ordered_b;
  IF v_role_a IS DISTINCT FROM 'user'::public.user_role
     OR v_role_b IS DISTINCT FROM 'user'::public.user_role THEN
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
  ELSIF COALESCE(p_amount, 0) <= 0 THEN
    PERFORM public.create_notification(
      ordered_a, 'matching_payment_required', 'Match offert',
      'Cette mise en relation est gratuite pendant l''offre de lancement.',
      jsonb_build_object('match_id', v_match_id, 'covered_by_launch', true)
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
  ELSIF COALESCE(p_amount, 0) <= 0 THEN
    PERFORM public.create_notification(
      ordered_b, 'matching_payment_required', 'Match offert',
      'Cette mise en relation est gratuite pendant l''offre de lancement.',
      jsonb_build_object('match_id', v_match_id, 'covered_by_launch', true)
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

-- Aligne les matchs déjà proposés pendant l'offre (encore « à payer »)
UPDATE public.payments
SET
  amount = 0,
  currency = 'USD',
  status = 'free',
  provider = 'manual',
  updated_at = NOW()
WHERE type = 'matching'
  AND status IN ('unpaid', 'failed');

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT match_id
    FROM public.payments
    WHERE type = 'matching'
      AND status = 'free'
      AND match_id IS NOT NULL
  LOOP
    PERFORM public.check_match_payment_status(r.match_id);
  END LOOP;
END $$;
