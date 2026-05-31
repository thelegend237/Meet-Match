-- ============================================================================
-- MEET & MATCH — Migration 008 : Correction inscription (trigger profil)
-- ============================================================================
-- Problème : le trigger BEFORE INSERT créait une notification avant que le
-- profil existe (FK), provoquant « Database error saving new user » à l'inscription.

CREATE OR REPLACE FUNCTION public.calculate_profile_completion_row(p public.profiles)
RETURNS INT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  score INT := 0;
BEGIN
  IF p.display_name IS NOT NULL AND trim(p.display_name) != '' THEN score := score + 5; END IF;
  IF p.date_of_birth IS NOT NULL THEN score := score + 5; END IF;
  IF p.gender IS NOT NULL THEN score := score + 5; END IF;

  IF p.country_code IS NOT NULL THEN score := score + 8; END IF;
  IF p.city IS NOT NULL AND trim(p.city) != '' THEN score := score + 7; END IF;

  IF p.bio IS NOT NULL AND char_length(trim(p.bio)) >= 20 THEN score := score + 15; END IF;

  IF p.expectations IS NOT NULL AND char_length(trim(p.expectations)) >= 10 THEN score := score + 8; END IF;
  IF p.relationship_type IS NOT NULL THEN score := score + 7; END IF;

  IF p.preferred_age_min IS NOT NULL AND p.preferred_age_max IS NOT NULL THEN score := score + 8; END IF;
  IF p.preferred_relation_scope IS NOT NULL THEN score := score + 7; END IF;

  IF p.primary_photo_url IS NOT NULL AND trim(p.primary_photo_url) != '' THEN score := score + 15; END IF;

  IF p.language IS NOT NULL THEN score := score + 5; END IF;
  IF p.phone IS NOT NULL AND trim(p.phone) != '' THEN score := score + 5; END IF;

  RETURN LEAST(score, 100);
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_profile_completion(p_profile_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = p_profile_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  RETURN public.calculate_profile_completion_row(p);
END;
$$;

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

  -- Notification uniquement après mise à jour (profil déjà en base)
  IF TG_OP = 'UPDATE'
    AND new_score < 80
    AND NEW.status = 'active'
    AND COALESCE(OLD.profile_completion, 0) < 80
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
BEGIN
  v_phone := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');
  v_country := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'country_code', '')), '');
  v_city := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'city', '')), '');

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
    trim(COALESCE(NEW.raw_user_meta_data->>'display_name', '')),
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

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Un compte existe déjà avec cet email ou ce numéro de téléphone.';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erreur création profil: %', SQLERRM;
END;
$$;
