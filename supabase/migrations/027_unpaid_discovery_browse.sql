-- ============================================================================
-- MEET & MATCH — Migration 027 : Parcourir sans payer, interagir après abonnement
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_browse_discovery()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_deleted = FALSE
      AND status IN ('active', 'pending')
      AND role IN ('user', 'admin', 'superadmin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_browse_discovery() TO authenticated;

-- discover_profiles : consultation pour tous les comptes actifs (même non payés)
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
    AND p.status::text = 'active'
    AND public.profile_has_discovery_photo(p.id)
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

GRANT EXECUTE ON FUNCTION public.discover_profiles(UUID[], INT) TO authenticated;

DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;

CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    role = 'user'
    AND public.can_browse_discovery()
    AND is_deleted = FALSE
    AND status = 'active'
    AND public.profile_has_discovery_photo(id)
    AND registration_payment_status IN ('paid', 'free')
    AND id != auth.uid()
  );
