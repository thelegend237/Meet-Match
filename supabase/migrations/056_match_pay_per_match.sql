-- ============================================================================
-- MEET & MATCH — Migration 056 : Matching pay-per-match (service, pas abonnement)
-- ============================================================================
-- Règles :
--   - Inscription : inchangée (activation mensuelle)
--   - Matching : payé à chaque mise en relation (pas de crédits mensuels)
--   - Like sens unique : seul le liker paie
--   - Like réciproque / manuel : les deux paient
--   - Match échoué : nouveau match = nouveau paiement (par match_id)

-- Matching : plus de crédits gratuits mensuels
CREATE OR REPLACE FUNCTION public.matching_monthly_allowance()
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 0;
$$;

CREATE OR REPLACE FUNCTION public.matching_free_credits_remaining(p_user_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT 0;
$$;

CREATE OR REPLACE FUNCTION public.get_matching_credits_status(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  has_ever_paid_matching BOOLEAN,
  monthly_allowance INT,
  used_this_month INT,
  remaining_this_month INT,
  billing_month DATE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    public.user_has_ever_paid_matching(p_user_id),
    0,
    0,
    0,
    public.matching_billing_month();
$$;

CREATE OR REPLACE FUNCTION public.create_matching_payment_for_user(
  p_user_id UUID,
  p_match_id UUID,
  p_amount DECIMAL,
  p_currency CHAR(3),
  p_liable BOOLEAN DEFAULT TRUE
)
RETURNS public.payment_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_status public.payment_status;
  v_amount DECIMAL := GREATEST(COALESCE(p_amount, 0), 0);
  v_metadata JSONB := '{}'::jsonb;
BEGIN
  IF NOT COALESCE(p_liable, TRUE) THEN
    v_status := 'free';
    v_amount := 0;
    v_metadata := jsonb_build_object('waived_reason', 'one_way_recipient');
  ELSIF public.user_is_on_trial(p_user_id) OR COALESCE(p_amount, 0) <= 0 THEN
    v_status := 'free';
    v_amount := 0;
    IF public.user_is_on_trial(p_user_id) THEN
      v_metadata := jsonb_build_object('covered_by_trial', true);
    ELSIF COALESCE(p_amount, 0) <= 0 THEN
      v_metadata := jsonb_build_object('covered_by_launch', true);
    END IF;
  ELSE
    v_status := 'unpaid';
  END IF;

  INSERT INTO public.payments (
    user_id, match_id, type, amount, currency, status, provider, metadata
  )
  VALUES (
    p_user_id,
    p_match_id,
    'matching',
    v_amount,
    p_currency,
    v_status,
    CASE WHEN v_status = 'free' THEN 'manual'::public.payment_provider ELSE 'stripe'::public.payment_provider END,
    v_metadata
  );

  RETURN v_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_matching_payment_status(
  p_user_id UUID,
  p_match_id UUID,
  p_status public.payment_status,
  p_liable BOOLEAN,
  p_amount DECIMAL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT COALESCE(p_liable, TRUE) THEN
    PERFORM public.create_notification(
      p_user_id,
      'matching_payment_required',
      'Match proposé',
      'Un administrateur vous propose un match. Les frais de matching sont à la charge de la personne qui a manifesté son intérêt en premier.',
      jsonb_build_object('match_id', p_match_id, 'waived_reason', 'one_way_recipient')
    );
    RETURN;
  END IF;

  IF p_status = 'unpaid' THEN
    PERFORM public.create_notification(
      p_user_id,
      'matching_payment_required',
      'Paiement requis',
      'Votre mise en relation est prête. Payez les frais de matching pour continuer.',
      jsonb_build_object('match_id', p_match_id)
    );
  ELSIF COALESCE(p_amount, 0) <= 0 THEN
    PERFORM public.create_notification(
      p_user_id,
      'matching_payment_required',
      'Match offert',
      'Cette mise en relation est gratuite (essai ou offre en cours).',
      jsonb_build_object('match_id', p_match_id, 'covered_by_promo', true)
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.propose_match(
  p_admin_id UUID,
  p_user_a_id UUID,
  p_user_b_id UUID,
  p_amount_a DECIMAL DEFAULT 10.00,
  p_currency_a CHAR(3) DEFAULT 'USD',
  p_amount_b DECIMAL DEFAULT 10.00,
  p_currency_b CHAR(3) DEFAULT 'USD',
  p_liable_a BOOLEAN DEFAULT TRUE,
  p_liable_b BOOLEAN DEFAULT TRUE,
  p_source TEXT DEFAULT 'manual'
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
  v_amount_a DECIMAL;
  v_amount_b DECIMAL;
  v_currency_a CHAR(3);
  v_currency_b CHAR(3);
  v_liable_a BOOLEAN;
  v_liable_b BOOLEAN;
BEGIN
  SELECT public.is_admin() INTO admin_ok;
  IF NOT admin_ok AND auth.uid() != p_admin_id THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  IF p_user_a_id < p_user_b_id THEN
    ordered_a := p_user_a_id;
    ordered_b := p_user_b_id;
    v_amount_a := p_amount_a;
    v_amount_b := p_amount_b;
    v_currency_a := p_currency_a;
    v_currency_b := p_currency_b;
    v_liable_a := COALESCE(p_liable_a, TRUE);
    v_liable_b := COALESCE(p_liable_b, TRUE);
  ELSE
    ordered_a := p_user_b_id;
    ordered_b := p_user_a_id;
    v_amount_a := p_amount_b;
    v_amount_b := p_amount_a;
    v_currency_a := p_currency_b;
    v_currency_b := p_currency_a;
    v_liable_a := COALESCE(p_liable_b, TRUE);
    v_liable_b := COALESCE(p_liable_a, TRUE);
  END IF;

  SELECT role INTO v_role_a FROM public.profiles WHERE id = ordered_a;
  SELECT role INTO v_role_b FROM public.profiles WHERE id = ordered_b;
  IF v_role_a IS DISTINCT FROM 'user'::public.user_role
     OR v_role_b IS DISTINCT FROM 'user'::public.user_role THEN
    RAISE EXCEPTION 'Cannot match staff accounts with members';
  END IF;

  IF public.user_has_blocking_match(ordered_a) THEN
    RAISE EXCEPTION 'Le membre % a déjà une mise en relation en cours.', ordered_a;
  END IF;

  IF public.user_has_blocking_match(ordered_b) THEN
    RAISE EXCEPTION 'Le membre % a déjà une mise en relation en cours.', ordered_b;
  END IF;

  INSERT INTO public.matches (user_a_id, user_b_id, status, proposed_by)
  VALUES (ordered_a, ordered_b, 'pending_payment', p_admin_id)
  RETURNING id INTO v_match_id;

  v_status_a := public.create_matching_payment_for_user(
    ordered_a, v_match_id, v_amount_a, v_currency_a, v_liable_a
  );
  v_status_b := public.create_matching_payment_for_user(
    ordered_b, v_match_id, v_amount_b, v_currency_b, v_liable_b
  );

  PERFORM public.create_notification(
    ordered_a, 'match_proposed', 'Match proposé',
    'Un administrateur vous propose un match.',
    jsonb_build_object('match_id', v_match_id, 'source', p_source)
  );
  PERFORM public.create_notification(
    ordered_b, 'match_proposed', 'Match proposé',
    'Un administrateur vous propose un match.',
    jsonb_build_object('match_id', v_match_id, 'source', p_source)
  );

  PERFORM public.notify_matching_payment_status(
    ordered_a, v_match_id, v_status_a, v_liable_a, v_amount_a
  );
  PERFORM public.notify_matching_payment_status(
    ordered_b, v_match_id, v_status_b, v_liable_b, v_amount_b
  );

  SELECT display_name INTO v_name_a FROM public.profiles WHERE id = ordered_a;
  SELECT display_name INTO v_name_b FROM public.profiles WHERE id = ordered_b;

  PERFORM public.notify_active_admins(
    'admin_match_pending',
    'Match proposé — paiements en attente',
    COALESCE(v_name_a, 'Membre') || ' et ' || COALESCE(v_name_b, 'Membre')
      || ' (' || COALESCE(p_source, 'manual') || ') — statuts : '
      || CASE
           WHEN NOT v_liable_a THEN 'exempté (A)'
           WHEN v_status_a = 'free' THEN 'gratuit (A)'
           ELSE 'à payer (A)'
         END
      || ' / '
      || CASE
           WHEN NOT v_liable_b THEN 'exempté (B)'
           WHEN v_status_b = 'free' THEN 'gratuit (B)'
           ELSE 'à payer (B)'
         END,
    jsonb_build_object(
      'match_id', v_match_id,
      'source', p_source,
      'payment_status_a', v_status_a,
      'payment_status_b', v_status_b,
      'liable_a', v_liable_a,
      'liable_b', v_liable_b
    )
  );

  PERFORM public.log_admin_action(
    p_admin_id, 'propose_match', 'match', v_match_id,
    jsonb_build_object(
      'user_a', ordered_a,
      'user_b', ordered_b,
      'source', p_source,
      'payment_status_a', v_status_a,
      'payment_status_b', v_status_b,
      'liable_a', v_liable_a,
      'liable_b', v_liable_b
    )
  );

  PERFORM public.check_match_payment_status(v_match_id);

  RETURN v_match_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_matching_payment_for_user(UUID, UUID, DECIMAL, CHAR, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.propose_match(UUID, UUID, UUID, DECIMAL, CHAR, DECIMAL, CHAR, BOOLEAN, BOOLEAN, TEXT) TO authenticated;
