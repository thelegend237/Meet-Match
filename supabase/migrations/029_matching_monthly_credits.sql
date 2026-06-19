-- ============================================================================
-- MEET & MATCH — Migration 029 : Crédits matching mensuels (3 gratuits / mois)
-- ============================================================================
-- Règle : 1er match payant, puis 3 matchs gratuits par mois calendaire (UTC),
-- renouvelés chaque mois, après au moins un paiement matching « paid ».

CREATE TABLE IF NOT EXISTS public.matching_credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  billing_month DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT matching_credit_usage_unique_pair UNIQUE (user_id, match_id)
);

CREATE INDEX IF NOT EXISTS idx_matching_credit_usage_user_month
  ON public.matching_credit_usage (user_id, billing_month);

ALTER TABLE public.matching_credit_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "matching_credit_usage_select_own" ON public.matching_credit_usage;
CREATE POLICY "matching_credit_usage_select_own"
  ON public.matching_credit_usage FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "matching_credit_usage_admin" ON public.matching_credit_usage;
CREATE POLICY "matching_credit_usage_admin"
  ON public.matching_credit_usage FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.matching_billing_month(p_at TIMESTAMPTZ DEFAULT NOW())
RETURNS DATE
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT date_trunc('month', timezone('utc', p_at))::date;
$$;

CREATE OR REPLACE FUNCTION public.user_has_ever_paid_matching(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.payments pay
    WHERE pay.user_id = p_user_id
      AND pay.type = 'matching'
      AND pay.status = 'paid'
  );
$$;

CREATE OR REPLACE FUNCTION public.matching_free_credits_used(
  p_user_id UUID,
  p_month DATE DEFAULT public.matching_billing_month()
)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT COUNT(*)::INT
  FROM public.matching_credit_usage u
  WHERE u.user_id = p_user_id
    AND u.billing_month = p_month;
$$;

CREATE OR REPLACE FUNCTION public.matching_monthly_allowance()
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 3;
$$;

CREATE OR REPLACE FUNCTION public.matching_free_credits_remaining(p_user_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT CASE
    WHEN NOT public.user_has_ever_paid_matching(p_user_id) THEN 0
    ELSE GREATEST(
      0,
      public.matching_monthly_allowance()
        - public.matching_free_credits_used(p_user_id, public.matching_billing_month())
    )
  END;
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
    public.matching_monthly_allowance(),
    public.matching_free_credits_used(p_user_id, public.matching_billing_month()),
    public.matching_free_credits_remaining(p_user_id),
    public.matching_billing_month();
$$;

GRANT EXECUTE ON FUNCTION public.get_matching_credits_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_ever_paid_matching(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.matching_free_credits_remaining(UUID) TO authenticated;

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
  IF NOT public.user_has_ever_paid_matching(p_user_id) THEN
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
    p_amount,
    p_currency,
    v_status,
    CASE WHEN v_status = 'free' THEN 'manual'::public.payment_provider ELSE 'stripe'::public.payment_provider END
  );

  RETURN v_status;
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
