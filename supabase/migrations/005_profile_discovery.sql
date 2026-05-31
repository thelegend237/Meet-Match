-- ============================================================================
-- MEET & MATCH — Migration 005 : Découverte (genre, vérifié, en ligne)
-- ============================================================================

CREATE TYPE public.gender_preference AS ENUM ('male', 'female', 'both');

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_gender public.gender_preference NOT NULL DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_preferred_gender ON public.profiles (preferred_gender);
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON public.profiles (is_verified)
  WHERE is_verified = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles (last_seen_at DESC);

COMMENT ON COLUMN public.profiles.preferred_gender IS 'Genre de profils à afficher dans Découvrir';
COMMENT ON COLUMN public.profiles.is_verified IS 'Compte vérifié par l''équipe Meet & Match';
COMMENT ON COLUMN public.profiles.last_seen_at IS 'Dernière activité — statut en ligne si < 5 min';
