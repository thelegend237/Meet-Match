-- ============================================================================
-- MEET & MATCH — Migration 055 : Fidélité match + désactivation succès + réactivation
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'reactivation_requested';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'admin_reactivation_requested';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'account_reactivated';

CREATE OR REPLACE FUNCTION public.user_has_blocking_match(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.matches m
    WHERE m.deleted_at IS NULL
      AND m.status IN ('pending_payment', 'active')
      AND (m.user_a_id = p_user_id OR m.user_b_id = p_user_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_has_blocking_match(UUID) TO authenticated;

-- propose_match : refuse si l'un des membres a déjà un match en cours
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

  IF public.user_has_blocking_match(ordered_a) THEN
    RAISE EXCEPTION 'Le membre % a déjà une mise en relation en cours.', ordered_a;
  END IF;

  IF public.user_has_blocking_match(ordered_b) THEN
    RAISE EXCEPTION 'Le membre % a déjà une mise en relation en cours.', ordered_b;
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

-- Clôture match : désactive les comptes si succès
CREATE OR REPLACE FUNCTION public.update_match_status(
  p_admin_id UUID,
  p_match_id UUID,
  p_status public.match_status,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m public.matches%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  SELECT * INTO m
  FROM public.matches
  WHERE id = p_match_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  UPDATE public.matches
  SET
    status = p_status,
    outcome_note = COALESCE(p_note, outcome_note),
    closed_at = CASE
      WHEN p_status IN ('success', 'failed', 'cancelled') THEN NOW()
      ELSE closed_at
    END,
    updated_at = NOW()
  WHERE id = p_match_id;

  IF p_status = 'success' THEN
    PERFORM public.create_notification(
      m.user_a_id, 'match_success', 'Match réussi',
      'Félicitations. Votre mise en relation a été finalisée. Votre compte est désormais en pause sur la plateforme.',
      jsonb_build_object('match_id', p_match_id)
    );
    PERFORM public.create_notification(
      m.user_b_id, 'match_success', 'Match réussi',
      'Félicitations. Votre mise en relation a été finalisée. Votre compte est désormais en pause sur la plateforme.',
      jsonb_build_object('match_id', p_match_id)
    );

    UPDATE public.profiles
    SET
      status = 'inactive',
      deactivated_at = NOW(),
      deactivation_reason = 'match_success',
      updated_at = NOW()
    WHERE id IN (m.user_a_id, m.user_b_id)
      AND is_deleted = FALSE;
  ELSIF p_status = 'failed' THEN
    PERFORM public.create_notification(
      m.user_a_id, 'match_failed', 'Match échoué',
      'Ce match n''a pas abouti, mais nous continuons à chercher pour vous.',
      jsonb_build_object('match_id', p_match_id)
    );
    PERFORM public.create_notification(
      m.user_b_id, 'match_failed', 'Match échoué',
      'Ce match n''a pas abouti, mais nous continuons à chercher pour vous.',
      jsonb_build_object('match_id', p_match_id)
    );
  END IF;

  IF p_status IN ('success', 'failed', 'cancelled') AND m.chat_id IS NOT NULL THEN
    UPDATE public.chats
    SET status = 'closed', closed_at = COALESCE(closed_at, NOW())
    WHERE id = m.chat_id;
  END IF;

  PERFORM public.log_admin_action(
    p_admin_id,
    'update_match_status',
    'match',
    p_match_id,
    jsonb_build_object('status', p_status)
  );
END;
$$;

-- Demande de réactivation (membre désactivé après match réussi)
CREATE OR REPLACE FUNCTION public.request_account_reactivation(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_name TEXT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND OR v_profile.is_deleted THEN
    RAISE EXCEPTION 'Profil introuvable';
  END IF;

  IF v_profile.status != 'inactive'
     OR v_profile.deactivation_reason IS DISTINCT FROM 'match_success' THEN
    RAISE EXCEPTION 'Réactivation non disponible pour ce compte';
  END IF;

  v_name := COALESCE(v_profile.display_name, v_profile.email, 'Membre');

  PERFORM public.create_notification(
    p_user_id,
    'reactivation_requested',
    'Demande enregistrée',
    'Votre demande de réactivation a été transmise à l''équipe. Vous serez contacté·e prochainement.',
    jsonb_build_object('user_id', p_user_id)
  );

  PERFORM public.notify_active_admins(
    'admin_reactivation_requested',
    'Demande de réactivation',
    v_name || ' souhaite réactiver son compte après une mise en relation réussie.',
    jsonb_build_object('user_id', p_user_id)
  );
END;
$$;

-- Réactivation par administrateur
CREATE OR REPLACE FUNCTION public.admin_reactivate_user(
  p_admin_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target public.profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_admin_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  SELECT * INTO v_target FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND OR v_target.is_deleted THEN
    RAISE EXCEPTION 'Utilisateur introuvable';
  END IF;

  IF v_target.role != 'user' THEN
    RAISE EXCEPTION 'Seuls les comptes membres peuvent être réactivés ici';
  END IF;

  UPDATE public.profiles
  SET
    status = 'active',
    deactivated_at = NULL,
    deactivation_reason = NULL,
    updated_at = NOW()
  WHERE id = p_user_id;

  PERFORM public.create_notification(
    p_user_id,
    'account_reactivated',
    'Compte réactivé',
    'Votre compte a été réactivé. Vous pouvez à nouveau utiliser Meet & Match.',
    jsonb_build_object('reactivated_by', p_admin_id)
  );

  PERFORM public.log_admin_action(
    p_admin_id,
    'reactivate_user',
    'profile',
    p_user_id,
    jsonb_build_object(
      'previous_status', v_target.status,
      'previous_reason', v_target.deactivation_reason
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_account_reactivation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reactivate_user(UUID, UUID) TO authenticated;
