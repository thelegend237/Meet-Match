-- ============================================================================
-- MEET & MATCH — Migration 032 : Limite upload photos profil → 50 Mo
-- ============================================================================

UPDATE storage.buckets
SET file_size_limit = 52428800
WHERE id = 'profile-photos';
