-- ============================================================================
-- MEET & MATCH — Migration 051 : Rappels essai + engagement nouveaux
-- ============================================================================
-- - Notifications trial_expiring à ~7 / 3 / 1 jours restants
-- - Engagement : intervalle 3 jours pour comptes < 30 jours

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'trial_expiring';

-- Rappels avant fin d'essai (appelé par cron expire-trials)
CREATE OR REPLACE FUNCTION public.process_trial_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  r RECORD;
  v_days INT;
  v_milestone INT;
  v_count INTEGER := 0;
  v_title TEXT;
  v_body TEXT;
BEGIN
  FOR r IN
    SELECT
      p.id,
      p.trial_ends_at,
      CEIL(EXTRACT(EPOCH FROM (p.trial_ends_at - NOW())) / 86400.0)::INT AS days_left
    FROM public.profiles p
    WHERE p.trial_ends_at IS NOT NULL
      AND p.trial_ends_at > NOW()
      AND p.registration_payment_status = 'free'
      AND COALESCE(p.is_deleted, FALSE) = FALSE
      AND p.role = 'user'
  LOOP
    v_days := r.days_left;

    IF v_days <= 1 THEN
      v_milestone := 1;
    ELSIF v_days <= 3 THEN
      v_milestone := 3;
    ELSIF v_days <= 7 THEN
      v_milestone := 7;
    ELSE
      CONTINUE;
    END IF;

    -- Une notif par jalon (7, 3, 1)
    IF EXISTS (
      SELECT 1
      FROM public.notifications n
      WHERE n.user_id = r.id
        AND n.type = 'trial_expiring'
        AND (n.metadata->>'milestone')::INT = v_milestone
    ) THEN
      CONTINUE;
    END IF;

    IF v_milestone = 1 THEN
      v_title := 'Dernier jour d''essai';
      v_body :=
        'Votre essai se termine demain. Activez votre compte pour continuer à liker et être mis en relation.';
    ELSIF v_milestone = 3 THEN
      v_title := 'Essai : 3 jours restants';
      v_body :=
        'Plus que quelques jours d''essai. Activez votre compte ou continuez à liker pendant qu''il vous reste du temps.';
    ELSE
      v_title := 'Mi-parcours de votre essai';
      v_body :=
        'Vous êtes à mi-chemin de vos 14 jours offerts. Complétez votre profil et likez pour maximiser vos chances de match.';
    END IF;

    PERFORM public.create_notification(
      r.id,
      'trial_expiring',
      v_title,
      v_body,
      jsonb_build_object(
        'milestone', v_milestone,
        'days_left', v_days,
        'trial_ends_at', r.trial_ends_at,
        'reminder', true,
        'automated', true
      )
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_trial_reminders() TO service_role;

-- Engagement : intervalle plus court pour les nouveaux (< 30 j)
CREATE OR REPLACE FUNCTION public.process_engagement_reminders(
  p_min_interval INTERVAL DEFAULT INTERVAL '5 days'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_profile_count INT := 0;
  v_likes_count INT := 0;
  v_match_count INT := 0;
  v_hint TEXT;
  v_user_interval INTERVAL;
  rec RECORD;
BEGIN
  -- Profils incomplets (< 80 %)
  FOR rec IN
    SELECT
      p.id AS user_id,
      p.profile_completion,
      p.created_at,
      CASE
        WHEN p.created_at > NOW() - INTERVAL '30 days' THEN INTERVAL '3 days'
        ELSE p_min_interval
      END AS user_interval
    FROM public.profiles p
    WHERE p.profile_completion < 80
      AND p.is_deleted = FALSE
      AND p.role = 'user'
      AND p.status IN ('pending', 'inactive', 'active')
      AND p.created_at < NOW() - INTERVAL '1 day'
  LOOP
    v_user_interval := rec.user_interval;

    IF EXISTS (
      SELECT 1
      FROM public.notifications n
      WHERE n.user_id = rec.user_id
        AND n.type = 'profile_incomplete'
        AND n.created_at > NOW() - v_user_interval
    ) THEN
      CONTINUE;
    END IF;

    v_hint := public.profile_completion_next_step(rec.user_id);

    PERFORM public.create_notification(
      rec.user_id,
      'profile_incomplete',
      'Profil incomplet',
      v_hint || ' Votre profil est complété à ' || rec.profile_completion::TEXT || ' %.',
      jsonb_build_object(
        'completion', rec.profile_completion,
        'reminder', true,
        'automated', true
      )
    );
    v_profile_count := v_profile_count + 1;
  END LOOP;

  -- Likes reçus sans réciprocité
  FOR rec IN
    SELECT
      p.id AS user_id,
      COUNT(DISTINCT l.from_user_id)::INT AS pending_likes,
      CASE
        WHEN p.created_at > NOW() - INTERVAL '30 days' THEN INTERVAL '3 days'
        ELSE p_min_interval
      END AS user_interval
    FROM public.profiles p
    INNER JOIN public.likes l ON l.to_user_id = p.id
    WHERE p.is_deleted = FALSE
      AND p.role = 'user'
      AND p.status IN ('active', 'pending', 'inactive')
      AND p.registration_payment_status IN ('paid', 'free')
      AND l.created_at > NOW() - INTERVAL '30 days'
      AND NOT EXISTS (
        SELECT 1
        FROM public.likes reciprocal
        WHERE reciprocal.from_user_id = p.id
          AND reciprocal.to_user_id = l.from_user_id
      )
    GROUP BY p.id, p.created_at
    HAVING COUNT(DISTINCT l.from_user_id) >= 1
  LOOP
    v_user_interval := rec.user_interval;

    IF EXISTS (
      SELECT 1
      FROM public.notifications n
      WHERE n.user_id = rec.user_id
        AND n.type = 'likes_interest_reminder'
        AND n.created_at > NOW() - v_user_interval
    ) THEN
      CONTINUE;
    END IF;

    PERFORM public.create_notification(
      rec.user_id,
      'likes_interest_reminder',
      'De l''intérêt pour votre profil',
      CASE
        WHEN rec.pending_likes = 1 THEN
          'Un membre s''intéresse à vous. Parcourez Découvrir et complétez vos likes pour favoriser une mise en relation.'
        ELSE
          rec.pending_likes::TEXT
            || ' membres s''intéressent à vous. Parcourez Découvrir pour garder l''élan.'
      END,
      jsonb_build_object(
        'pending_likes', rec.pending_likes,
        'reminder', true,
        'automated', true
      )
    );
    v_likes_count := v_likes_count + 1;
  END LOOP;

  -- Match : payé, partenaire en attente
  FOR rec IN
    SELECT DISTINCT ON (paid.user_id, m.id)
      m.id AS match_id,
      paid.user_id,
      partner.display_name AS partner_name,
      CASE
        WHEN payer.created_at > NOW() - INTERVAL '30 days' THEN INTERVAL '3 days'
        ELSE p_min_interval
      END AS user_interval
    FROM public.matches m
    INNER JOIN public.payments paid
      ON paid.match_id = m.id
      AND paid.type = 'matching'
      AND paid.status IN ('paid', 'free')
      AND paid.user_id IN (m.user_a_id, m.user_b_id)
    INNER JOIN public.payments unpaid
      ON unpaid.match_id = m.id
      AND unpaid.type = 'matching'
      AND unpaid.status IN ('unpaid', 'failed')
      AND unpaid.user_id IN (m.user_a_id, m.user_b_id)
      AND unpaid.user_id != paid.user_id
    INNER JOIN public.profiles payer ON payer.id = paid.user_id
    INNER JOIN public.profiles partner ON partner.id = unpaid.user_id
    WHERE m.status = 'pending_payment'
      AND payer.is_deleted = FALSE
      AND payer.role = 'user'
      AND GREATEST(paid.updated_at, paid.created_at) < NOW() - INTERVAL '2 days'
    ORDER BY paid.user_id, m.id, paid.updated_at DESC
  LOOP
    v_user_interval := rec.user_interval;

    IF EXISTS (
      SELECT 1
      FROM public.notifications n
      WHERE n.user_id = rec.user_id
        AND n.type = 'match_partner_payment_pending'
        AND (n.metadata->>'match_id')::uuid = rec.match_id
        AND n.created_at > NOW() - v_user_interval
    ) THEN
      CONTINUE;
    END IF;

    PERFORM public.create_notification(
      rec.user_id,
      'match_partner_payment_pending',
      'Match en attente du partenaire',
      'Vous avez confirmé votre match'
        || CASE
          WHEN rec.partner_name IS NOT NULL AND trim(rec.partner_name) != '' THEN
            ' avec ' || rec.partner_name
          ELSE ''
        END
        || '. Nous attendons encore le règlement de votre partenaire pour ouvrir la discussion.',
      jsonb_build_object(
        'match_id', rec.match_id,
        'reminder', true,
        'automated', true
      )
    );
    v_match_count := v_match_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'profile_reminders_sent', v_profile_count,
    'likes_reminders_sent', v_likes_count,
    'match_partner_reminders_sent', v_match_count,
    'min_interval', p_min_interval::text
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_engagement_reminders(INTERVAL) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_engagement_reminders(INTERVAL) TO service_role;
