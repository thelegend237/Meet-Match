-- ============================================================================
-- MEET & MATCH — Migration 017 : Système de notifications unifié
-- ============================================================================
-- - Types étendus (like reçu, alertes admin)
-- - notify_active_admins() helper
-- - Like → notifie le destinataire + alerte admin si like réciproque
-- - Paiement confirmé (inscription / matching)
-- - Alertes admin : nouveau membre, match en attente
-- - Profil incomplet : pas de doublon si déjà non lu

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'like_received';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'admin_new_member';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'admin_mutual_like';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'admin_registration_unpaid';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'admin_match_pending';

-- Notifie tous les administrateurs actifs
CREATE OR REPLACE FUNCTION public.notify_active_admins(
  p_type public.notification_type,
  p_title TEXT,
  p_content TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  FOR v_admin_id IN
    SELECT p.id
    FROM public.profiles p
    LEFT JOIN public.admin_profiles ap ON ap.id = p.id
    WHERE p.role IN ('admin', 'superadmin')
      AND p.is_deleted = FALSE
      AND p.status = 'active'
      AND (ap.id IS NULL OR ap.is_active = TRUE)
  LOOP
    PERFORM public.create_notification(
      v_admin_id,
      p_type,
      p_title,
      p_content,
      p_metadata
    );
  END LOOP;
END;
$$;

-- Profil incomplet : une seule alerte non lue à la fois
CREATE OR REPLACE FUNCTION public.trigger_recalculate_profile_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_score INT;
BEGIN
  new_score := public.calculate_profile_completion_row(NEW);
  NEW.profile_completion := new_score;

  IF TG_OP = 'UPDATE'
    AND new_score < 80
    AND NEW.status = 'active'
    AND NEW.role = 'user'
    AND COALESCE(OLD.profile_completion, 0) < 80
    AND NOT EXISTS (
      SELECT 1
      FROM public.notifications n
      WHERE n.user_id = NEW.id
        AND n.type = 'profile_incomplete'
        AND n.is_read = FALSE
    )
  THEN
    PERFORM public.create_notification(
      NEW.id,
      'profile_incomplete',
      'Profil incomplet',
      'Complétez votre profil pour augmenter vos chances de match.',
      jsonb_build_object('completion', new_score)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Paiement confirmé + logique existante
CREATE OR REPLACE FUNCTION public.trigger_check_match_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('paid', 'free') AND NEW.type = 'matching' AND NEW.match_id IS NOT NULL THEN
    PERFORM public.check_match_payment_status(NEW.match_id);
  END IF;

  IF NEW.status IN ('paid', 'free') AND NEW.type = 'registration' THEN
    UPDATE public.profiles
    SET
      registration_payment_status = NEW.status,
      status = CASE WHEN status = 'pending' THEN 'active' ELSE status END,
      updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;

  IF TG_OP = 'UPDATE'
    AND NEW.status IN ('paid', 'free')
    AND COALESCE(OLD.status, 'unpaid') = 'unpaid'
  THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'payment_confirmed',
      CASE
        WHEN NEW.type = 'registration' THEN 'Inscription activée'
        ELSE 'Paiement de matching confirmé'
      END,
      CASE
        WHEN NEW.type = 'registration' THEN
          'Votre accès à Meet & Match est activé. Vous pouvez découvrir des profils.'
        ELSE
          'Votre paiement a bien été enregistré. L''équipe finalise votre mise en relation.'
      END,
      jsonb_build_object(
        'payment_id', NEW.id,
        'match_id', NEW.match_id,
        'payment_type', NEW.type
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Like : notifie le destinataire ; alerte admin si réciproque
CREATE OR REPLACE FUNCTION public.trigger_like_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_name TEXT;
  v_to_name TEXT;
  v_is_mutual BOOLEAN;
BEGIN
  SELECT display_name INTO v_from_name
  FROM public.profiles WHERE id = NEW.from_user_id;

  SELECT display_name INTO v_to_name
  FROM public.profiles WHERE id = NEW.to_user_id;

  PERFORM public.create_notification(
    NEW.to_user_id,
    'like_received',
    'Nouveau like',
    COALESCE(v_from_name, 'Un membre') || ' s''intéresse à votre profil.',
    jsonb_build_object('from_user_id', NEW.from_user_id)
  );

  SELECT EXISTS (
    SELECT 1
    FROM public.likes l
    WHERE l.from_user_id = NEW.to_user_id
      AND l.to_user_id = NEW.from_user_id
  ) INTO v_is_mutual;

  IF v_is_mutual THEN
    PERFORM public.notify_active_admins(
      'admin_mutual_like',
      'Like réciproque',
      COALESCE(v_from_name, 'Membre') || ' et ' || COALESCE(v_to_name, 'Membre')
        || ' se sont likés — une mise en relation est possible.',
      jsonb_build_object(
        'user_a_id', LEAST(NEW.from_user_id, NEW.to_user_id),
        'user_b_id', GREATEST(NEW.from_user_id, NEW.to_user_id)
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Nouveau membre : alerte admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone TEXT;
  v_country TEXT;
  v_city TEXT;
  v_display_name TEXT;
BEGIN
  v_phone := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');
  v_country := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'country_code', '')), '');
  v_city := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'city', '')), '');
  v_display_name := trim(COALESCE(NEW.raw_user_meta_data->>'display_name', ''));

  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    phone,
    country_code,
    city
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_display_name,
    v_phone,
    v_country,
    v_city
  );

  PERFORM public.create_notification(
    NEW.id,
    'account_created',
    'Bienvenue sur Meet & Match',
    'Votre compte a été créé. Complétez votre profil pour commencer.',
    '{}'
  );

  PERFORM public.notify_active_admins(
    'admin_new_member',
    'Nouveau membre',
    COALESCE(NULLIF(v_display_name, ''), NEW.email) || ' vient de créer un compte.',
    jsonb_build_object('user_id', NEW.id)
  );

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Un compte existe déjà avec cet email ou ce numéro de téléphone.';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erreur création profil: %', SQLERRM;
END;
$$;

-- propose_match : alerte admin (en plus des notifs membres existantes)
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
