-- ============================================================================
-- MEET & MATCH — Migration 038 : Modification des messages (fenêtre 30 min)
-- ============================================================================

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
