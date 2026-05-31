-- ============================================================================
-- MEET & MATCH — Migration 009 : Géolocalisation scalable (PostGIS)
-- Cache géocode partagé + coordonnées profil + découverte triée par distance
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------------------
-- Cache géocode (ville + pays → coordonnées), partagé entre tous les profils
-- ---------------------------------------------------------------------------
CREATE TABLE public.geocode_cache (
  city_key TEXT NOT NULL,
  country_code CHAR(2) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  source TEXT NOT NULL DEFAULT 'seed',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (city_key, country_code),
  CONSTRAINT geocode_cache_lat_valid CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT geocode_cache_lng_valid CHECK (longitude BETWEEN -180 AND 180)
);

CREATE INDEX idx_geocode_cache_country ON public.geocode_cache (country_code);

ALTER TABLE public.geocode_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "geocode_cache_select_authenticated"
  ON public.geocode_cache FOR SELECT
  TO authenticated
  USING (TRUE);

-- ---------------------------------------------------------------------------
-- Colonnes profil
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location geography(POINT, 4326),
  ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_latitude_valid
    CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT profiles_longitude_valid
    CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);

CREATE INDEX idx_profiles_location_gist
  ON public.profiles
  USING GIST (location)
  WHERE location IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Utilitaires
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_city_key(p_city TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    lower(
      trim(
        regexp_replace(
          translate(
            coalesce(p_city, ''),
            'àâäáãåçèéêëìíîïñòóôöùúûüýÿ',
            'aaaaaaceeeeiiiinooooouuuuyy'
          ),
          '\s+',
          ' ',
          'g'
        )
      )
    ),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.sync_profile_geography()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(
      ST_MakePoint(NEW.longitude, NEW.latitude),
      4326
    )::geography;
    IF TG_OP = 'INSERT'
      OR NEW.latitude IS DISTINCT FROM OLD.latitude
      OR NEW.longitude IS DISTINCT FROM OLD.longitude THEN
      NEW.geocoded_at := NOW();
    END IF;
  ELSE
    NEW.location := NULL;
    NEW.geocoded_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_geography ON public.profiles;
CREATE TRIGGER profiles_sync_geography
  BEFORE INSERT OR UPDATE OF latitude, longitude
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_geography();

CREATE OR REPLACE FUNCTION public.apply_geocode_cache_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_cached RECORD;
  v_key TEXT;
BEGIN
  IF NEW.city IS NULL OR NEW.country_code IS NULL THEN
    RETURN NEW;
  END IF;

  v_key := public.normalize_city_key(NEW.city);
  IF v_key IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT gc.latitude, gc.longitude
  INTO v_cached
  FROM public.geocode_cache gc
  WHERE gc.city_key = v_key
    AND gc.country_code = NEW.country_code;

  IF FOUND THEN
    NEW.latitude := v_cached.latitude;
    NEW.longitude := v_cached.longitude;
  ELSIF TG_OP = 'UPDATE'
    AND (
      NEW.city IS DISTINCT FROM OLD.city
      OR NEW.country_code IS DISTINCT FROM OLD.country_code
    ) THEN
    NEW.latitude := NULL;
    NEW.longitude := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_apply_geocode_cache ON public.profiles;
CREATE TRIGGER profiles_apply_geocode_cache
  BEFORE INSERT OR UPDATE OF city, country_code
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_geocode_cache_to_profile();

-- ---------------------------------------------------------------------------
-- Données initiales du cache (villes seeds + onboarding)
-- ---------------------------------------------------------------------------
INSERT INTO public.geocode_cache (city_key, country_code, latitude, longitude, source)
VALUES
  ('paris', 'FR', 48.8566, 2.3522, 'seed'),
  ('lyon', 'FR', 45.764, 4.8357, 'seed'),
  ('marseille', 'FR', 43.2965, 5.3698, 'seed'),
  ('toulouse', 'FR', 43.6047, 1.4442, 'seed'),
  ('nice', 'FR', 43.7102, 7.262, 'seed'),
  ('nantes', 'FR', 47.2184, -1.5536, 'seed'),
  ('strasbourg', 'FR', 48.5734, 7.7521, 'seed'),
  ('montpellier', 'FR', 43.6108, 3.8767, 'seed'),
  ('bordeaux', 'FR', 44.8378, -0.5792, 'seed'),
  ('lille', 'FR', 50.6292, 3.0573, 'seed'),
  ('rennes', 'FR', 48.1173, -1.6778, 'seed'),
  ('reims', 'FR', 49.2583, 4.0317, 'seed'),
  ('bruxelles', 'BE', 50.8503, 4.3517, 'seed'),
  ('liege', 'BE', 50.6326, 5.5797, 'seed'),
  ('luxembourg', 'LU', 49.6116, 6.1319, 'seed'),
  ('geneve', 'CH', 46.2044, 6.1432, 'seed'),
  ('lausanne', 'CH', 46.5197, 6.6323, 'seed'),
  ('montreal', 'CA', 45.5017, -73.5673, 'seed'),
  ('quebec', 'CA', 46.8139, -71.208, 'seed'),
  ('douala', 'CM', 4.0511, 9.7679, 'seed'),
  ('yaounde', 'CM', 3.848, 11.5021, 'seed'),
  ('abidjan', 'CI', 5.36, -4.0083, 'seed'),
  ('dakar', 'SN', 14.7167, -17.4677, 'seed')
ON CONFLICT (city_key, country_code) DO UPDATE SET
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  source = EXCLUDED.source,
  updated_at = NOW();

-- Appliquer le cache aux profils existants
UPDATE public.profiles p
SET
  latitude = gc.latitude,
  longitude = gc.longitude
FROM public.geocode_cache gc
WHERE public.normalize_city_key(p.city) = gc.city_key
  AND p.country_code = gc.country_code;

-- ---------------------------------------------------------------------------
-- RPC : lecture cache
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cached_geocode(
  p_city TEXT,
  p_country_code CHAR(2)
)
RETURNS TABLE (
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gc.latitude, gc.longitude
  FROM public.geocode_cache gc
  WHERE gc.city_key = public.normalize_city_key(p_city)
    AND gc.country_code = p_country_code;
$$;

-- ---------------------------------------------------------------------------
-- RPC : enregistrer coordonnées (own profile) + enrichir le cache
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_profile_coordinates(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_source TEXT DEFAULT 'nominatim'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_city TEXT;
  v_country CHAR(2);
  v_key TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF p_latitude IS NULL OR p_longitude IS NULL THEN
    RAISE EXCEPTION 'Coordonnées invalides';
  END IF;

  SELECT city, country_code
  INTO v_city, v_country
  FROM public.profiles
  WHERE id = v_uid;

  IF v_city IS NULL OR v_country IS NULL THEN
    RAISE EXCEPTION 'Ville ou pays manquant sur le profil';
  END IF;

  v_key := public.normalize_city_key(v_city);
  IF v_key IS NOT NULL THEN
    INSERT INTO public.geocode_cache (
      city_key, country_code, latitude, longitude, source, updated_at
    )
    VALUES (
      v_key, v_country, p_latitude, p_longitude, coalesce(p_source, 'nominatim'), NOW()
    )
    ON CONFLICT (city_key, country_code) DO UPDATE SET
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      source = EXCLUDED.source,
      updated_at = NOW();
  END IF;

  UPDATE public.profiles
  SET latitude = p_latitude, longitude = p_longitude
  WHERE id = v_uid;
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC : découverte triée par proximité (PostGIS KNN + index GIST)
-- ---------------------------------------------------------------------------
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
    AND p.is_deleted = FALSE
    AND p.status = 'active'
    AND p.primary_photo_url IS NOT NULL
    AND p.registration_payment_status IN ('paid', 'free')
  ORDER BY
    CASE
      WHEN v_viewer_loc IS NOT NULL AND p.location IS NOT NULL THEN
        p.location <-> v_viewer_loc
    END NULLS LAST,
    p.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 2000));
END;
$$;

GRANT EXECUTE ON FUNCTION public.normalize_city_key TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cached_geocode TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_profile_coordinates TO authenticated;
GRANT EXECUTE ON FUNCTION public.discover_profiles TO authenticated;
