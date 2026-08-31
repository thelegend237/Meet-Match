-- ============================================================================
-- MEET & MATCH — Migration 059 : Ouverture fiable d'une discussion admin ↔ membre
-- ============================================================================
-- Corrige les messages admin envoyés au mauvais membre (réutilisation de chat
-- ambiguë). Une discussion admin_contact = exactement 1 membre (role user).

CREATE OR REPLACE FUNCTION public.get_or_create_admin_user_chat(
  p_admin_id UUID,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chat_id UUID;
  v_profile public.profiles%ROWTYPE;
  v_user_participant_count INT;
BEGIN
  IF NOT public.is_admin() OR auth.uid() IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
    AND is_deleted = FALSE;

  IF NOT FOUND OR v_profile.role != 'user' THEN
    RAISE EXCEPTION 'Membre introuvable';
  END IF;

  -- Chat ouvert déjà lié à CE membre (1 seul participant user = p_user_id)
  SELECT c.id INTO v_chat_id
  FROM public.chats c
  WHERE c.type = 'admin_contact'
    AND c.deleted_at IS NULL
    AND c.status = 'open'
    AND EXISTS (
      SELECT 1
      FROM public.chat_participants cp
      WHERE cp.chat_id = c.id
        AND cp.user_id = p_user_id
        AND cp.role = 'user'
    )
    AND (
      SELECT COUNT(*)
      FROM public.chat_participants cpu
      WHERE cpu.chat_id = c.id
        AND cpu.role = 'user'
    ) = 1
  ORDER BY c.created_at DESC
  LIMIT 1;

  IF v_chat_id IS NULL THEN
    INSERT INTO public.chats (
      type,
      status,
      contact_name,
      contact_email,
      created_by
    )
    VALUES (
      'admin_contact',
      'open',
      COALESCE(v_profile.display_name, v_profile.email),
      v_profile.email,
      p_admin_id
    )
    RETURNING id INTO v_chat_id;

    INSERT INTO public.chat_participants (chat_id, user_id, role)
    VALUES (v_chat_id, p_user_id, 'user');
  END IF;

  -- L'admin doit être participant pour envoyer / lire
  INSERT INTO public.chat_participants (chat_id, user_id, role)
  VALUES (v_chat_id, p_admin_id, 'admin')
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  RETURN v_chat_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_admin_user_chat(UUID, UUID) TO authenticated;
