-- ============================================================================
-- MEET & MATCH — Script de diagnostic schéma Supabase
-- Exécuter dans le SQL Editor pour vérifier les prérequis avant 009 / 013
-- ============================================================================

-- 1. Colonnes profiles attendues
SELECT
  column_name,
  CASE WHEN column_name IN (
    'city', 'country_code', 'gender', 'registration_payment_status',
    'status', 'is_deleted', 'primary_photo_url', 'is_verified', 'last_seen_at',
    'latitude', 'longitude', 'location'
  ) THEN '✓ requis' ELSE '  optionnel' END AS importance
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Colonnes manquantes critiques (001 + 005 + 009)
SELECT unnest(ARRAY[
  'city', 'country_code', 'gender', 'registration_payment_status',
  'status', 'is_deleted', 'primary_photo_url', 'is_verified', 'last_seen_at'
]) AS colonne_manquante
EXCEPT
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles';

-- 3. Enums Meet & Match (001)
SELECT typname AS enum_manquant
FROM unnest(ARRAY[
  'gender_type', 'payment_status', 'profile_status', 'relationship_type'
]::text[]) AS typname
WHERE NOT EXISTS (
  SELECT 1 FROM pg_type t
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public' AND t.typname = typname.typname
);

-- 4. Fonctions requises (002, 009, 013)
SELECT unnest(ARRAY[
  'is_active_user', 'is_admin', 'normalize_city_key', 'discover_profiles', 'search_geo_cities'
]) AS fonction_manquante
EXCEPT
SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public';

-- 5. Tables geo (009, 013)
SELECT unnest(ARRAY['geocode_cache', 'geo_cities']) AS table_manquante
EXCEPT
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
