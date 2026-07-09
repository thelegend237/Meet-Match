-- ============================================================================
-- MEET & MATCH — Migration 039 : Relances automatiques paiements en attente
-- ============================================================================
-- Envoie des notifications (in-app + email/push via outbox) aux membres dont
-- le paiement matching ou d'inscription est toujours impayé, avec déduplication
-- sur une fenêtre configurable (défaut 3 jours).

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'registration_payment_required';

CREATE OR REPLACE FUNCTION public.process_automatic_payment_reminders(
  p_min_interval INTERVAL DEFAULT INTERVAL '3 days'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_matching_count INT := 0;
  v_registration_count INT := 0;
  rec RECORD;
BEGIN
  -- Paiements matching impayés / échoués (match encore en attente)
  FOR rec IN
    SELECT DISTINCT ON (pay.user_id, pay.match_id)
      pay.user_id,
      pay.match_id,
      pay.id AS payment_id
    FROM public.payments pay
    INNER JOIN public.matches m ON m.id = pay.match_id
    INNER JOIN public.profiles p ON p.id = pay.user_id
    WHERE pay.type = 'matching'
      AND pay.status IN ('unpaid', 'failed')
      AND m.status IN ('pending', 'pending_payment')
      AND p.is_deleted = FALSE
      AND p.role = 'user'
      AND NOT public.user_has_matching_access(pay.user_id, pay.match_id)
      AND m.proposed_at < NOW() - INTERVAL '1 day'
      AND NOT EXISTS (
        SELECT 1
        FROM public.notifications n
        WHERE n.user_id = pay.user_id
          AND n.type = 'matching_payment_required'
          AND (n.metadata->>'match_id')::uuid = pay.match_id
          AND n.created_at > NOW() - p_min_interval
      )
    ORDER BY pay.user_id, pay.match_id, pay.created_at DESC
  LOOP
    PERFORM public.create_notification(
      rec.user_id,
      'matching_payment_required',
      'Rappel — paiement matching',
      'Votre mise en relation est toujours en attente. Réglez les frais de matching depuis Mes matchs pour ouvrir la discussion.',
      jsonb_build_object(
        'match_id', rec.match_id,
        'payment_id', rec.payment_id,
        'reminder', true,
        'automated', true
      )
    );
    v_matching_count := v_matching_count + 1;
  END LOOP;

  -- Frais d'inscription impayés
  FOR rec IN
    SELECT p.id AS user_id
    FROM public.profiles p
    WHERE p.registration_payment_status = 'unpaid'
      AND p.is_deleted = FALSE
      AND p.role = 'user'
      AND p.status IN ('pending', 'inactive', 'active')
      AND p.created_at < NOW() - INTERVAL '1 day'
      AND NOT EXISTS (
        SELECT 1
        FROM public.free_accesses fa
        WHERE fa.user_id = p.id
          AND fa.access_type IN ('full', 'registration')
          AND (fa.expires_at IS NULL OR fa.expires_at > NOW())
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.notifications n
        WHERE n.user_id = p.id
          AND n.type = 'registration_payment_required'
          AND n.created_at > NOW() - p_min_interval
      )
  LOOP
    PERFORM public.create_notification(
      rec.user_id,
      'registration_payment_required',
      'Rappel — frais d''inscription',
      'Votre accès complet est en attente. Finalisez le paiement d''inscription depuis la page Paiements pour profiter de Meet & Match.',
      jsonb_build_object('reminder', true, 'automated', true)
    );
    v_registration_count := v_registration_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'matching_reminders_sent', v_matching_count,
    'registration_reminders_sent', v_registration_count,
    'min_interval', p_min_interval::text
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_automatic_payment_reminders(INTERVAL) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_automatic_payment_reminders(INTERVAL) TO service_role;
