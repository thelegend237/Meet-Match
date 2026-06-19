-- ============================================================================
-- MEET & MATCH — Migration 026 : Visibilité partenaire de match + garde staff
-- ============================================================================
-- Corrige : un membre ne voyait pas son match (profil partenaire admin ou sans
-- photo publique) → impossible de payer. Permet aussi de voir le paiement du
-- partenaire sur le même match (attente « l'autre a payé »).

-- Interdire la mise en relation d'un compte staff (admin/superadmin)
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
  v_name_a TEXT;
  v_name_b TEXT;
  v_role_a public.user_role;
  v_role_b public.user_role;
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

  INSERT INTO public.payments (user_id, match_id, type, amount, currency, status)
  VALUES
    (ordered_a, v_match_id, 'matching', p_amount, p_currency, 'unpaid'),
    (ordered_b, v_match_id, 'matching', p_amount, p_currency, 'unpaid');

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
  PERFORM public.create_notification(
    ordered_a, 'matching_payment_required', 'Paiement requis',
    'Votre mise en relation est prête. Payez les frais de matching pour continuer.',
    jsonb_build_object('match_id', v_match_id)
  );
  PERFORM public.create_notification(
    ordered_b, 'matching_payment_required', 'Paiement requis',
    'Votre mise en relation est prête. Payez les frais de matching pour continuer.',
    jsonb_build_object('match_id', v_match_id)
  );

  SELECT display_name INTO v_name_a FROM public.profiles WHERE id = ordered_a;
  SELECT display_name INTO v_name_b FROM public.profiles WHERE id = ordered_b;

  PERFORM public.notify_active_admins(
    'admin_match_pending',
    'Match proposé — paiements en attente',
    COALESCE(v_name_a, 'Membre') || ' et ' || COALESCE(v_name_b, 'Membre')
      || ' doivent régler les frais de matching.',
    jsonb_build_object('match_id', v_match_id)
  );

  PERFORM public.log_admin_action(
    p_admin_id, 'propose_match', 'match', v_match_id,
    jsonb_build_object('user_a', ordered_a, 'user_b', ordered_b)
  );

  RETURN v_match_id;
END;
$$;

-- Profil visible pour son partenaire de match (membre ↔ membre, y compris sans photo publique)
DROP POLICY IF EXISTS "profiles_select_match_partner" ON public.profiles;

CREATE POLICY "profiles_select_match_partner"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id != auth.uid()
    AND is_deleted = FALSE
    AND EXISTS (
      SELECT 1
      FROM public.matches m
      WHERE m.status IN ('pending', 'pending_payment', 'active', 'success')
        AND (
          (m.user_a_id = auth.uid() AND m.user_b_id = profiles.id)
          OR (m.user_b_id = auth.uid() AND m.user_a_id = profiles.id)
        )
    )
  );

-- Paiements matching visibles entre co-participants d'un même match
DROP POLICY IF EXISTS "payments_select_match_participant" ON public.payments;

CREATE POLICY "payments_select_match_participant"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    type = 'matching'
    AND match_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.matches m
      WHERE m.id = payments.match_id
        AND (m.user_a_id = auth.uid() OR m.user_b_id = auth.uid())
    )
  );
