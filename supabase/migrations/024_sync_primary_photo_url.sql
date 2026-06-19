-- ============================================================================
-- MEET & MATCH — Migration 024 : Synchronisation primary_photo_url
-- ============================================================================
-- Répare les profils avec photos dans profile_photos mais sans primary_photo_url
-- (invisibles en découverte).

-- Backfill depuis profile_photos (priorité is_primary, puis sort_order)
UPDATE public.profiles p
SET
  primary_photo_url = sub.url,
  updated_at = NOW()
FROM (
  SELECT DISTINCT ON (profile_id)
    profile_id,
    url
  FROM public.profile_photos
  ORDER BY profile_id, is_primary DESC, sort_order ASC, created_at ASC
) sub
WHERE p.id = sub.profile_id
  AND (p.primary_photo_url IS NULL OR trim(p.primary_photo_url) = '');

-- Trigger renforcé : sync à chaque photo principale ou première photo du profil
CREATE OR REPLACE FUNCTION public.sync_primary_photo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_primary = TRUE THEN
    UPDATE public.profiles
    SET primary_photo_url = NEW.url, updated_at = NOW()
    WHERE id = NEW.profile_id;
  ELSIF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
    SET primary_photo_url = NEW.url, updated_at = NOW()
    WHERE id = NEW.profile_id
      AND (primary_photo_url IS NULL OR trim(primary_photo_url) = '');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profile_photos_sync_primary ON public.profile_photos;

CREATE TRIGGER profile_photos_sync_primary
  AFTER INSERT OR UPDATE OF is_primary, url ON public.profile_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_primary_photo();

-- discover_profiles : photo effective (colonne ou galerie)
CREATE OR REPLACE FUNCTION public.profile_has_discovery_photo(p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = p_profile_id
      AND pr.primary_photo_url IS NOT NULL
      AND trim(pr.primary_photo_url) != ''
  )
  OR EXISTS (
    SELECT 1 FROM public.profile_photos ph
    WHERE ph.profile_id = p_profile_id
  );
$$;

CREATE OR REPLACE FUNCTION public.profile_discovery_photo_url(p_profile_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(trim(p.primary_photo_url), ''),
    (
      SELECT ph.url
      FROM public.profile_photos ph
      WHERE ph.profile_id = p_profile_id
      ORDER BY ph.is_primary DESC, ph.sort_order ASC, ph.created_at ASC
      LIMIT 1
    )
  )
  FROM public.profiles p
  WHERE p.id = p_profile_id;
$$;

DROP FUNCTION IF EXISTS public.discover_profiles(UUID[], INT);

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
GRANT EXECUTE ON FUNCTION public.profile_has_discovery_photo(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.profile_discovery_photo_url(UUID) TO authenticated;

-- RLS : visibilité si photo en colonne ou en galerie
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;

CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    role = 'user'
    AND public.is_active_user()
    AND is_deleted = FALSE
    AND status = 'active'
    AND public.profile_has_discovery_photo(id)
    AND registration_payment_status IN ('paid', 'free')
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
        AND p.status = 'active'
        AND public.profile_has_discovery_photo(p.id)
        AND p.registration_payment_status IN ('paid', 'free')
    )
  );
