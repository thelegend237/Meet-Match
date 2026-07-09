-- ============================================================================
-- MEET & MATCH — Migration 040 : Alertes admin — inscriptions impayées anciennes
-- ============================================================================
-- Étend le cron de relance : notifie les admins lorsqu'un membre est inscrit
-- depuis longtemps sans avoir payé (défaut : 7+ jours, alerte max 1× / 7 jours).

-- Remplace la version à 1 paramètre (migration 039).
DROP FUNCTION IF EXISTS public.process_automatic_payment_reminders(INTERVAL);

CREATE OR REPLACE FUNCTION public.process_automatic_payment_reminders(
  p_min_interval INTERVAL DEFAULT INTERVAL '3 days',
  p_admin_stale_age INTERVAL DEFAULT INTERVAL '7 days',
  p_admin_min_interval INTERVAL DEFAULT INTERVAL '7 days'
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
  v_admin_count INT := 0;
  v_days INT;
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

  -- Frais d'inscription impayés (relance membre)
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

  -- Alertes admin : inscriptions impayées depuis longtemps
  FOR rec IN
    SELECT
      p.id AS user_id,
      p.display_name,
      p.email,
      p.created_at
    FROM public.profiles p
    WHERE p.registration_payment_status = 'unpaid'
      AND p.is_deleted = FALSE
      AND p.role = 'user'
      AND p.status IN ('pending', 'inactive', 'active')
      AND p.created_at < NOW() - p_admin_stale_age
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
        WHERE n.type = 'admin_registration_unpaid'
          AND (n.metadata->>'user_id')::uuid = p.id
          AND n.created_at > NOW() - p_admin_min_interval
      )
  LOOP
    v_days := GREATEST(1, EXTRACT(DAY FROM NOW() - rec.created_at)::INT);

    PERFORM public.notify_active_admins(
      'admin_registration_unpaid',
      'Inscription impayée — relance conseillée',
      COALESCE(NULLIF(TRIM(rec.display_name), ''), 'Membre')
        || ' s''est inscrit(e) il y a '
        || v_days::TEXT
        || ' jour'
        || CASE WHEN v_days > 1 THEN 's' ELSE '' END
        || ' sans régler les frais d''inscription.',
      jsonb_build_object(
        'user_id', rec.user_id,
        'days_unpaid', v_days,
        'email', rec.email,
        'automated', true
      )
    );
    v_admin_count := v_admin_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'matching_reminders_sent', v_matching_count,
    'registration_reminders_sent', v_registration_count,
    'admin_registration_alerts_sent', v_admin_count,
    'min_interval', p_min_interval::text,
    'admin_stale_age', p_admin_stale_age::text,
    'admin_min_interval', p_admin_min_interval::text
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_automatic_payment_reminders(INTERVAL, INTERVAL, INTERVAL) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_automatic_payment_reminders(INTERVAL, INTERVAL, INTERVAL) TO service_role;
