-- ============================================================================
-- MEET & MATCH — Migration 031 : Masquage utilisateur & suppression conversations
--
-- Utilisateur : masque la conversation pour lui seul (chat_participants.hidden_at)
-- Admin        : suppression logique globale (chats.deleted_at)
-- Superadmin   : suppression définitive (DELETE chats → cascade messages)
-- ============================================================================

ALTER TABLE public.chat_participants
  ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;

ALTER TABLE public.chats
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chat_participants_user_visible
  ON public.chat_participants (user_id)
  WHERE hidden_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_chats_not_deleted
  ON public.chats (created_at DESC)
  WHERE deleted_at IS NULL;

-- Masquer une conversation (membre uniquement)
CREATE OR REPLACE FUNCTION public.hide_chat_for_user(p_chat_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.chat_participants
    WHERE chat_id = p_chat_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.chats
    WHERE id = p_chat_id
      AND deleted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Conversation unavailable';
  END IF;

  UPDATE public.chat_participants
  SET hidden_at = NOW()
  WHERE chat_id = p_chat_id
    AND user_id = auth.uid();
END;
$$;

-- Suppression logique par un administrateur
CREATE OR REPLACE FUNCTION public.admin_soft_delete_chat(p_chat_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  UPDATE public.chats
  SET
    deleted_at = NOW(),
    deleted_by = auth.uid(),
    status = 'closed',
    closed_at = COALESCE(closed_at, NOW())
  WHERE id = p_chat_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation introuvable ou déjà supprimée';
  END IF;
END;
$$;

-- Suppression définitive par superadmin
CREATE OR REPLACE FUNCTION public.superadmin_hard_delete_chat(p_chat_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Unauthorized: superadmin only';
  END IF;

  DELETE FROM public.chats
  WHERE id = p_chat_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation introuvable';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hide_chat_for_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_soft_delete_chat(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.superadmin_hard_delete_chat(UUID) TO authenticated;

-- Réafficher une conversation masquée quand un nouveau message arrive
CREATE OR REPLACE FUNCTION public.unhide_chat_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_participants
  SET hidden_at = NULL
  WHERE chat_id = NEW.chat_id
    AND hidden_at IS NOT NULL
    AND (NEW.sender_id IS NULL OR user_id IS DISTINCT FROM NEW.sender_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_unhide_chat_on_new_message ON public.messages;

CREATE TRIGGER trg_unhide_chat_on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.unhide_chat_on_new_message();

DROP POLICY IF EXISTS "chats_select_participant" ON public.chats;

CREATE POLICY "chats_select_participant"
  ON public.chats FOR SELECT
  TO authenticated
  USING (
    (public.is_chat_participant(id) OR public.is_admin())
    AND (deleted_at IS NULL OR public.is_superadmin())
  );
