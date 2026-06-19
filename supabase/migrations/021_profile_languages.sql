-- ============================================================================
-- MEET & MATCH — Migration 021 : Langues parlées multiples (profiles.languages)
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS languages TEXT[] NOT NULL DEFAULT '{}';

UPDATE public.profiles
SET languages = ARRAY[language]
WHERE language IS NOT NULL
  AND trim(language) != ''
  AND (languages IS NULL OR languages = '{}');

CREATE OR REPLACE FUNCTION public.sync_profile_languages_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.languages IS NOT NULL AND cardinality(NEW.languages) > 0 THEN
    NEW.language := NEW.languages[1];
  ELSIF NEW.language IS NOT NULL AND trim(NEW.language) != '' THEN
    NEW.languages := ARRAY[trim(NEW.language)];
  ELSE
    NEW.language := NULL;
    NEW.languages := '{}';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_languages ON public.profiles;

CREATE TRIGGER profiles_sync_languages
  BEFORE INSERT OR UPDATE OF languages, language ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_languages_fields();

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

  IF p.primary_photo_url IS NOT NULL AND trim(p.primary_photo_url) != '' THEN score := score + 15; END IF;

  IF (p.languages IS NOT NULL AND cardinality(p.languages) > 0)
     OR (p.language IS NOT NULL AND trim(p.language) != '') THEN
    score := score + 5;
  END IF;
  IF p.phone IS NOT NULL AND trim(p.phone) != '' THEN score := score + 5; END IF;

  RETURN LEAST(score, 100);
END;
$$;

CREATE OR REPLACE FUNCTION public.discover_profiles(
  p_excluded_ids UUID[] DEFAULT ARRAY[]::UUID[],
  p_limit INT DEFAULT 1000
)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  date_of_birth DATE,
  country_code CHAR(2),
  city TEXT,
  language TEXT,
  languages TEXT[],
  primary_photo_url TEXT,
  bio TEXT,
  gender public.gender_type,
  expectations TEXT,
  relationship_type public.relationship_type,
  created_at TIMESTAMPTZ,
  is_verified BOOLEAN,
  last_seen_at TIMESTAMPTZ,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_km NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viewer_id UUID := auth.uid();
  v_viewer_loc geography;
BEGIN
  IF v_viewer_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Compte non actif';
  END IF;

  SELECT p.location INTO v_viewer_loc
  FROM public.profiles p
  WHERE p.id = v_viewer_id;

  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    p.date_of_birth,
    p.country_code,
    p.city,
    p.language,
    p.languages,
    p.primary_photo_url,
    p.bio,
    p.gender,
    p.expectations,
    p.relationship_type,
    p.created_at,
    p.is_verified,
    p.last_seen_at,
    p.latitude,
    p.longitude,
    CASE
      WHEN v_viewer_loc IS NOT NULL AND p.location IS NOT NULL THEN
        ROUND((ST_Distance(v_viewer_loc, p.location) / 1000.0)::numeric, 0)
      ELSE NULL
    END AS distance_km
  FROM public.profiles p
  WHERE p.id <> v_viewer_id
    AND NOT (p.id = ANY (coalesce(p_excluded_ids, ARRAY[]::UUID[])))
    AND p.role = 'user'
    AND p.is_deleted = FALSE
    AND p.status::text = 'active'
    AND p.primary_photo_url IS NOT NULL
    AND p.registration_payment_status::text IN ('paid', 'free')
  ORDER BY
    CASE
      WHEN v_viewer_loc IS NOT NULL AND p.location IS NOT NULL THEN
        p.location <-> v_viewer_loc
    END NULLS LAST,
    p.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 2000));
END;
$$;
