-- ============================================================================
-- MEET & MATCH — Migration 042 : Relance admin depuis un paiement (liste)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_remind_payment(
  p_admin_id UUID,
  p_payment_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  pay public.payments%ROWTYPE;
  v_notification_id UUID;
  admin_ok BOOLEAN;
BEGIN
  SELECT public.is_admin() INTO admin_ok;
  IF NOT admin_ok AND auth.uid() != p_admin_id THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  SELECT * INTO pay FROM public.payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paiement introuvable';
  END IF;

  IF pay.status NOT IN ('unpaid', 'failed') THEN
    RAISE EXCEPTION 'Aucune relance nécessaire pour ce paiement';
  END IF;

  IF pay.type = 'matching' THEN
    IF pay.match_id IS NULL THEN
      RAISE EXCEPTION 'Match introuvable pour ce paiement';
    END IF;
    RETURN public.admin_remind_matching_payment(
      p_admin_id,
      pay.match_id,
      pay.user_id
    );
  END IF;

  IF pay.type = 'registration' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = pay.user_id
        AND p.registration_payment_status = 'unpaid'
        AND p.is_deleted = FALSE
    ) THEN
      RAISE EXCEPTION 'L''inscription de ce membre est déjà réglée';
    END IF;

    v_notification_id := public.create_notification(
      pay.user_id,
      'registration_payment_required',
      'Rappel — frais d''inscription',
      'Votre accès complet est en attente. Finalisez le paiement d''inscription depuis la page Paiements pour profiter de Meet & Match.',
      jsonb_build_object(
        'payment_id', pay.id,
        'reminder', true
      )
    );

    PERFORM public.log_admin_action(
      p_admin_id,
      'remind_registration_payment',
      'payment',
      pay.id,
      jsonb_build_object('user_id', pay.user_id)
    );

    RETURN v_notification_id;
  END IF;

  RAISE EXCEPTION 'Type de paiement non pris en charge';
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_remind_payment(UUID, UUID) TO authenticated;
