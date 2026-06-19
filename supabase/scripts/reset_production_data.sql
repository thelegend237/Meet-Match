-- ============================================================================
-- MEET & MATCH — Réinitialisation données (production / vrais utilisateurs)
-- ============================================================================
--
-- ⚠️  IRRÉVERSIBLE — supprime TOUS les comptes et toute l'activité.
--     Conserve : schéma, migrations, geo_cities (~30 villes), app_settings.
--
-- Quand l'utiliser :
--   - Passer des données de test (seed_test_data) à une base « prod » vide
--   - Repartir de zéro avant d'inviter de vrais testeurs
--
-- NE PAS utiliser si vous voulez seulement retirer les comptes @test.com :
--   → exécuter uniquement le bloc « Nettoyage » en tête de seed_test_data.sql
--
-- Après ce script : voir PRODUCTION_SETUP.md
-- ============================================================================

BEGIN;

-- Fonction helper du seed de test (si présente)
DROP FUNCTION IF EXISTS public.__seed_create_user(UUID, TEXT, TEXT, TEXT, TEXT, TEXT);

-- 1. Messagerie & réactions
DELETE FROM public.message_reactions;
DELETE FROM public.messages;
DELETE FROM public.chat_participants;
DELETE FROM public.chats;

-- 2. Notifications & journaux
DELETE FROM public.notifications;
DELETE FROM public.admin_logs;

-- 3. Accès, paiements, matchs
DELETE FROM public.free_accesses;
DELETE FROM public.payments;
DELETE FROM public.matches;

-- 4. Social & profils
DELETE FROM public.likes;
DELETE FROM public.profile_passes;
DELETE FROM public.profile_photos;
DELETE FROM public.admin_profiles;

-- 5. Cache géocode utilisateur (conserver geo_cities)
TRUNCATE public.geocode_cache;

-- 6. Paramètres — garder les tarifs, retirer la référence admin supprimée
UPDATE public.app_settings SET updated_by = NULL WHERE updated_by IS NOT NULL;

-- 7. Comptes Auth (cascade → profiles)
-- Note : les fichiers Storage (bucket profile-photos) ne peuvent pas être
-- supprimés en SQL (protection Supabase). Avant ou après ce script :
--   npm run storage:empty-photos
-- ou Dashboard → Storage → profile-photos → supprimer les fichiers.
DELETE FROM auth.identities;
DELETE FROM auth.users;

COMMIT;

-- Vérification rapide (doit retourner 0 partout)
SELECT
  (SELECT COUNT(*) FROM auth.users) AS auth_users,
  (SELECT COUNT(*) FROM public.profiles) AS profiles,
  (SELECT COUNT(*) FROM public.matches) AS matches,
  (SELECT COUNT(*) FROM public.likes) AS likes,
  (SELECT COUNT(*) FROM public.chats) AS chats,
  (SELECT COUNT(*) FROM public.geo_cities) AS geo_cities,
  (SELECT COUNT(*) FROM public.app_settings) AS app_settings;
