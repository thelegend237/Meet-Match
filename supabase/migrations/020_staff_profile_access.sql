-- ============================================================================
-- MEET & MATCH — Migration 020 : Profil membre pour admin / superadmin
-- ============================================================================

-- Staff : accès plateforme sans paiement d'inscription
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_deleted = FALSE
      AND (
        role IN ('admin', 'superadmin')
        OR (
          status = 'active'
          AND registration_payment_status IN ('paid', 'free')
        )
      )
  );
$$;

-- Les comptes staff ne doivent pas apparaître dans la découverte
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

-- Visibilité publique : membres uniquement (pas admin / superadmin)
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;

CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    role = 'user'
    AND public.is_active_user()
    AND is_deleted = FALSE
    AND status = 'active'
    AND primary_photo_url IS NOT NULL
    AND registration_payment_status IN ('paid', 'free')
    AND id != auth.uid()
  );
