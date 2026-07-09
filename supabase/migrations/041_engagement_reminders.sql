-- ============================================================================
-- MEET & MATCH — Migration 041 : Relances rétention (profil, likes, matchs)
-- ============================================================================
-- Cron engagement : profil incomplet, likes non réciproqués, match en attente
-- du paiement partenaire.

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'likes_interest_reminder';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'match_partner_payment_pending';

CREATE OR REPLACE FUNCTION public.profile_completion_next_step(p_profile_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  p public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = p_profile_id;
  IF NOT FOUND THEN
    RETURN 'Complétez votre profil pour augmenter vos chances de match.';
  END IF;

  IF p.primary_photo_url IS NULL OR trim(p.primary_photo_url) = '' THEN
    RETURN 'Ajoutez une photo principale pour être remarqué(e).';
  END IF;
  IF p.bio IS NULL OR char_length(trim(p.bio)) < 20 THEN
    RETURN 'Rédigez une bio d''au moins 20 caractères pour vous présenter.';
  END IF;
  IF p.city IS NULL OR trim(p.city) = '' OR p.country_code IS NULL THEN
    RETURN 'Indiquez votre ville et votre pays pour des rencontres pertinentes.';
  END IF;
  IF p.expectations IS NULL OR char_length(trim(p.expectations)) < 10 THEN
    RETURN 'Précisez vos attentes pour aider l''équipe à vous proposer des matchs.';
  END IF;
  IF p.relationship_type IS NULL THEN
    RETURN 'Indiquez le type de relation recherché.';
  END IF;
  IF p.preferred_age_min IS NULL OR p.preferred_age_max IS NULL OR p.preferred_relation_scope IS NULL THEN
    RETURN 'Complétez vos préférences de recherche (âge, périmètre).';
  END IF;
  IF (p.languages IS NULL OR cardinality(p.languages) = 0)
     AND (p.language IS NULL OR trim(p.language) = '') THEN
    RETURN 'Ajoutez les langues que vous parlez.';
  END IF;
  IF p.phone IS NULL OR trim(p.phone) = '' THEN
    RETURN 'Ajoutez un numéro de téléphone pour faciliter le contact.';
  END IF;

  RETURN 'Complétez les dernières informations de votre profil.';
END;
$$;

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
  rec RECORD;
BEGIN
  -- Profils incomplets (< 80 %, seuil aligné sur le trigger existant)
  FOR rec IN
    SELECT p.id AS user_id, p.profile_completion
    FROM public.profiles p
    WHERE p.profile_completion < 80
      AND p.is_deleted = FALSE
      AND p.role = 'user'
      AND p.status IN ('pending', 'inactive', 'active')
      AND p.created_at < NOW() - INTERVAL '1 day'
      AND NOT EXISTS (
        SELECT 1
        FROM public.notifications n
        WHERE n.user_id = p.id
          AND n.type = 'profile_incomplete'
          AND n.created_at > NOW() - p_min_interval
      )
  LOOP
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

  -- Likes reçus sans réciprocité (encourager l'activité sur Découvrir)
  FOR rec IN
    SELECT
      p.id AS user_id,
      COUNT(DISTINCT l.from_user_id)::INT AS pending_likes
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
      AND NOT EXISTS (
        SELECT 1
        FROM public.notifications n
        WHERE n.user_id = p.id
          AND n.type = 'likes_interest_reminder'
          AND n.created_at > NOW() - p_min_interval
      )
    GROUP BY p.id
    HAVING COUNT(DISTINCT l.from_user_id) >= 1
  LOOP
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

  -- Match : vous avez payé, le partenaire attend encore
  FOR rec IN
    SELECT DISTINCT ON (paid.user_id, m.id)
      m.id AS match_id,
      paid.user_id,
      partner.display_name AS partner_name
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
      AND NOT EXISTS (
        SELECT 1
        FROM public.notifications n
        WHERE n.user_id = paid.user_id
          AND n.type = 'match_partner_payment_pending'
          AND (n.metadata->>'match_id')::uuid = m.id
          AND n.created_at > NOW() - p_min_interval
      )
    ORDER BY paid.user_id, m.id, paid.updated_at DESC
  LOOP
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
