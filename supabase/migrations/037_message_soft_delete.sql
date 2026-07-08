-- ============================================================================
-- MEET & MATCH — Migration 037 : Suppression douce des messages
-- ============================================================================

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_deleted_at
  ON public.messages (chat_id, deleted_at)
  WHERE deleted_at IS NOT NULL;
