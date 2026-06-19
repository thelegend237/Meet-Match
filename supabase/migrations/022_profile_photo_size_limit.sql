-- ============================================================================
-- MEET & MATCH — Migration 022 : Limite upload photos profil → 25 Mo
-- ============================================================================

UPDATE storage.buckets
SET file_size_limit = 26214400
WHERE id = 'profile-photos';
