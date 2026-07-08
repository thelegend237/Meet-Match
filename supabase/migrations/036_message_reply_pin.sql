-- ============================================================================
-- MEET & MATCH — Migration 036 : Réponse à un message + épinglage
-- ============================================================================

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id
  ON public.messages (reply_to_id)
  WHERE reply_to_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_pinned
  ON public.messages (chat_id, pinned_at DESC NULLS LAST)
  WHERE is_pinned = TRUE;

-- Participants peuvent épingler / désépingler des messages de la discussion
DROP POLICY IF EXISTS "messages_update_metadata" ON public.messages;
CREATE POLICY "messages_update_metadata"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (public.is_chat_participant(chat_id) OR public.is_admin())
  WITH CHECK (public.is_chat_participant(chat_id) OR public.is_admin());

ALTER TABLE public.messages REPLICA IDENTITY FULL;
