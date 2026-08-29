-- ============================================================================
-- MEET & MATCH — Migration 053 : complétion profil + preferred_gender
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_profile_completion(p_profile_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.profiles%ROWTYPE;
  score INT := 0;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = p_profile_id;
  IF NOT FOUND THEN RETURN 0; END IF;

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
  IF p.preferred_gender IS NOT NULL THEN score := score + 5; END IF;

  IF p.primary_photo_url IS NOT NULL AND trim(p.primary_photo_url) != '' THEN score := score + 15; END IF;

  IF (p.languages IS NOT NULL AND cardinality(p.languages) > 0)
     OR (p.language IS NOT NULL AND trim(p.language) != '') THEN
    score := score + 5;
  END IF;
  IF p.phone IS NOT NULL AND trim(p.phone) != '' THEN score := score + 5; END IF;

  RETURN LEAST(score, 100);
END;
$$;

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
  IF p.preferred_gender IS NOT NULL THEN score := score + 5; END IF;

  IF p.primary_photo_url IS NOT NULL AND trim(p.primary_photo_url) != '' THEN score := score + 15; END IF;

  IF (p.languages IS NOT NULL AND cardinality(p.languages) > 0)
     OR (p.language IS NOT NULL AND trim(p.language) != '') THEN
    score := score + 5;
  END IF;
  IF p.phone IS NOT NULL AND trim(p.phone) != '' THEN score := score + 5; END IF;

  RETURN LEAST(score, 100);
END;
$$;
