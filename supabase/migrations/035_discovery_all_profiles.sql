-- ============================================================================
-- MEET & MATCH — Migration 035 : Tous les profils visibles en découverte
-- ============================================================================
-- - Membres actifs OU en attente, avec photo (payés ou non)
-- - Corrige les listes vides quand peu de membres ou comptes récents

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

  IF NOT public.can_browse_discovery() THEN
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
    public.profile_discovery_photo_url(p.id),
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
    AND p.status::text IN ('active', 'pending')
    AND public.profile_has_discovery_photo(p.id)
    AND p.registration_payment_status::text IN ('paid', 'free', 'unpaid')
  ORDER BY
    CASE
      WHEN v_viewer_loc IS NOT NULL AND p.location IS NOT NULL THEN
        p.location <-> v_viewer_loc
    END NULLS LAST,
    p.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 2000));
END;
$$;

GRANT EXECUTE ON FUNCTION public.discover_profiles(UUID[], INT) TO authenticated;

DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;

CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    role = 'user'
    AND public.can_browse_discovery()
    AND is_deleted = FALSE
    AND status IN ('active', 'pending')
    AND public.profile_has_discovery_photo(id)
    AND registration_payment_status IN ('paid', 'free', 'unpaid')
    AND id != auth.uid()
  );

DROP POLICY IF EXISTS "profile_photos_select" ON public.profile_photos;

CREATE POLICY "profile_photos_select"
  ON public.profile_photos FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_photos.profile_id
        AND p.is_deleted = FALSE
        AND p.status IN ('active', 'pending')
        AND public.profile_has_discovery_photo(p.id)
        AND p.registration_payment_status IN ('paid', 'free', 'unpaid')
    )
  );
