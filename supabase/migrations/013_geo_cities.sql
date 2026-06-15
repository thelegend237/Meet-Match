-- ============================================================================
-- MEET & MATCH — Migration 013 : Référentiel villes (GeoNames) + autocomplete
--
-- PRÉREQUIS : migrations 001 → 012, en particulier :
--   009_profile_geolocation → normalize_city_key, geocode_cache, triggers profil
--
-- Après cette migration : npm run seed:geo (référentiel complet ~26k villes)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table référentiel villes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.geo_cities (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  country_code CHAR(2) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  population INT NOT NULL DEFAULT 0,
  admin1_code TEXT,
  timezone TEXT,
  CONSTRAINT geo_cities_lat_valid CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT geo_cities_lng_valid CHECK (longitude BETWEEN -180 AND 180)
);

CREATE INDEX IF NOT EXISTS idx_geo_cities_country ON public.geo_cities (country_code);
CREATE INDEX IF NOT EXISTS idx_geo_cities_country_name ON public.geo_cities (country_code, name_normalized);
CREATE INDEX IF NOT EXISTS idx_geo_cities_country_population ON public.geo_cities (country_code, population DESC);

ALTER TABLE public.geo_cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "geo_cities_select_public" ON public.geo_cities;
CREATE POLICY "geo_cities_select_public"
  ON public.geo_cities FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- Lecture cache géocode pour l'autocomplete inscription (anon)
DROP POLICY IF EXISTS "geocode_cache_select_anon" ON public.geocode_cache;
CREATE POLICY "geocode_cache_select_anon"
  ON public.geocode_cache FOR SELECT
  TO anon
  USING (TRUE);

-- ---------------------------------------------------------------------------
-- RPC : recherche villes par pays (autocomplete inscription)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_geo_cities(
  p_country_code CHAR(2),
  p_query TEXT DEFAULT '',
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id BIGINT,
  name TEXT,
  country_code CHAR(2),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  population INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.name,
    c.country_code,
    c.latitude,
    c.longitude,
    c.population
  FROM public.geo_cities c
  WHERE c.country_code = upper(trim(p_country_code))
    AND (
      coalesce(trim(p_query), '') = ''
      OR c.name ILIKE trim(p_query) || '%'
      OR c.name_normalized LIKE public.normalize_city_key(p_query) || '%'
    )
  ORDER BY c.population DESC NULLS LAST, c.name ASC
  LIMIT LEAST(GREATEST(coalesce(p_limit, 20), 1), 50);
$$;

-- ---------------------------------------------------------------------------
-- Enrichir le trigger profil (009) : geo_cities puis geocode_cache
-- ---------------------------------------------------------------------------
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
  FROM public.geo_cities gc
  WHERE gc.name_normalized = v_key
    AND gc.country_code = NEW.country_code
  ORDER BY gc.population DESC
  LIMIT 1;

  IF NOT FOUND THEN
    SELECT gcc.latitude, gcc.longitude
    INTO v_cached
    FROM public.geocode_cache gcc
    WHERE gcc.city_key = v_key
      AND gcc.country_code = NEW.country_code;
  END IF;

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

-- ---------------------------------------------------------------------------
-- Enrichir get_cached_geocode (009) : geo_cities puis geocode_cache
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cached_geocode(
  p_city TEXT,
  p_country_code CHAR(2)
)
RETURNS TABLE (
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT gc.latitude, gc.longitude
  FROM public.geo_cities gc
  WHERE gc.name_normalized = public.normalize_city_key(p_city)
    AND gc.country_code = p_country_code
  ORDER BY gc.population DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT gcc.latitude, gcc.longitude
  FROM public.geocode_cache gcc
  WHERE gcc.city_key = public.normalize_city_key(p_city)
    AND gcc.country_code = p_country_code;
END;
$$;

-- ---------------------------------------------------------------------------
-- Seed initial (~30 métropoles — compléter via npm run seed:geo)
-- ---------------------------------------------------------------------------
INSERT INTO public.geo_cities (id, name, name_normalized, country_code, latitude, longitude, population)
VALUES
  (2988507, 'Paris', 'paris', 'FR', 48.8566, 2.3522, 2161000),
  (2996944, 'Lyon', 'lyon', 'FR', 45.764, 4.8357, 472317),
  (2995469, 'Marseille', 'marseille', 'FR', 43.2965, 5.3698, 794811),
  (2972315, 'Toulouse', 'toulouse', 'FR', 43.6047, 1.4442, 433055),
  (2990440, 'Nice', 'nice', 'FR', 43.7102, 7.262, 338620),
  (2990969, 'Nantes', 'nantes', 'FR', 47.2184, -1.5536, 277269),
  (2973783, 'Strasbourg', 'strasbourg', 'FR', 48.5734, 7.7521, 274845),
  (2992166, 'Montpellier', 'montpellier', 'FR', 43.6108, 3.8767, 248252),
  (3031582, 'Bordeaux', 'bordeaux', 'FR', 44.8378, -0.5792, 231281),
  (2998324, 'Lille', 'lille', 'FR', 50.6292, 3.0573, 228328),
  (2983990, 'Rennes', 'rennes', 'FR', 48.1173, -1.6778, 209375),
  (2984114, 'Reims', 'reims', 'FR', 49.2583, 4.0317, 179992),
  (2800866, 'Bruxelles', 'bruxelles', 'BE', 50.8503, 4.3517, 1019022),
  (2792413, 'Liège', 'liege', 'BE', 50.6326, 5.5797, 195278),
  (2960316, 'Luxembourg', 'luxembourg', 'LU', 49.6116, 6.1319, 76684),
  (2660646, 'Genève', 'geneve', 'CH', 46.2044, 6.1432, 183981),
  (2659994, 'Lausanne', 'lausanne', 'CH', 46.5197, 6.6323, 116751),
  (6077243, 'Montréal', 'montreal', 'CA', 45.5017, -73.5673, 1704694),
  (6325494, 'Québec', 'quebec', 'CA', 46.8139, -71.208, 531902),
  (2232593, 'Douala', 'douala', 'CM', 4.0511, 9.7679, 1338082),
  (2220952, 'Yaoundé', 'yaounde', 'CM', 3.848, 11.5021, 1299369),
  (2293538, 'Abidjan', 'abidjan', 'CI', 5.36, -4.0083, 3677102),
  (224667, 'Dakar', 'dakar', 'SN', 14.7167, -17.4677, 2476400),
  (5128581, 'New York', 'new york', 'US', 40.7128, -74.006, 8336817),
  (5368361, 'Los Angeles', 'los angeles', 'US', 34.0522, -118.2437, 3979576),
  (2643743, 'London', 'london', 'GB', 51.5074, -0.1278, 8961989),
  (2950159, 'Berlin', 'berlin', 'DE', 52.52, 13.405, 3644826),
  (3117735, 'Madrid', 'madrid', 'ES', 40.4168, -3.7038, 3255944),
  (3169070, 'Rome', 'rome', 'IT', 41.9028, 12.4964, 2318895),
  (2553604, 'Casablanca', 'casablanca', 'MA', 33.5731, -7.5898, 3144909),
  (2464470, 'Tunis', 'tunis', 'TN', 36.8065, 10.1815, 693210),
  (2507480, 'Alger', 'alger', 'DZ', 36.7538, 3.0588, 2364230),
  (292223, 'Dubai', 'dubai', 'AE', 25.2048, 55.2708, 3331420)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_normalized = EXCLUDED.name_normalized,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  population = EXCLUDED.population;

INSERT INTO public.geocode_cache (city_key, country_code, latitude, longitude, source)
SELECT gc.name_normalized, gc.country_code, gc.latitude, gc.longitude, 'geo_cities'
FROM public.geo_cities gc
ON CONFLICT (city_key, country_code) DO UPDATE SET
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  source = EXCLUDED.source,
  updated_at = NOW();

GRANT EXECUTE ON FUNCTION public.normalize_city_key TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_geo_cities TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_cached_geocode TO anon, authenticated;
