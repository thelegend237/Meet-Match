-- ============================================================================
-- MEET & MATCH — Migration 030 : Relance paiement matching (admin)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_remind_matching_payment(
  p_admin_id UUID,
  p_match_id UUID,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  m public.matches%ROWTYPE;
  pay public.payments%ROWTYPE;
  v_notification_id UUID;
  admin_ok BOOLEAN;
BEGIN
  SELECT public.is_admin() INTO admin_ok;
  IF NOT admin_ok AND auth.uid() != p_admin_id THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  SELECT * INTO m FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF m.status NOT IN ('pending', 'pending_payment') THEN
    RAISE EXCEPTION 'Ce match n''est plus en attente de paiement';
  END IF;

  IF p_user_id NOT IN (m.user_a_id, m.user_b_id) THEN
    RAISE EXCEPTION 'Utilisateur non participant à ce match';
  END IF;

  SELECT * INTO pay
  FROM public.payments
  WHERE match_id = p_match_id
    AND user_id = p_user_id
    AND type = 'matching'
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paiement matching introuvable';
  END IF;

  IF pay.status NOT IN ('unpaid', 'failed') THEN
    RAISE EXCEPTION 'Aucune relance nécessaire pour ce membre';
  END IF;

  v_notification_id := public.create_notification(
    p_user_id,
    'matching_payment_required',
    'Rappel — paiement matching',
    'Votre mise en relation est en attente. Réglez les frais de matching depuis Mes matchs pour ouvrir la discussion.',
    jsonb_build_object('match_id', p_match_id, 'reminder', true)
  );

  PERFORM public.log_admin_action(
    p_admin_id,
    'remind_matching_payment',
    'match',
    p_match_id,
    jsonb_build_object('user_id', p_user_id, 'payment_id', pay.id)
  );

  RETURN v_notification_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_remind_matching_payment(UUID, UUID, UUID) TO authenticated;
