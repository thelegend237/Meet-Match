-- ============================================================================
-- MEET & MATCH — Migration 016 : Contact administrateur (corrections)
-- ============================================================================
-- - Réutilise une conversation admin_contact ouverte pour le même membre
-- - Assigne un admin même sans ligne admin_profiles
-- - Notifie les administrateurs

CREATE OR REPLACE FUNCTION public.create_admin_contact_chat(
  p_name TEXT,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chat_id UUID;
  v_admin_id UUID;
  v_trimmed_message TEXT;
BEGIN
  v_trimmed_message := NULLIF(trim(COALESCE(p_message, '')), '');

  IF p_user_id IS NOT NULL THEN
    SELECT c.id INTO v_chat_id
    FROM public.chats c
    INNER JOIN public.chat_participants cp ON cp.chat_id = c.id AND cp.user_id = p_user_id
    WHERE c.type = 'admin_contact'
      AND c.status = 'open'
    ORDER BY c.created_at DESC
    LIMIT 1;

    IF v_chat_id IS NOT NULL THEN
      IF v_trimmed_message IS NOT NULL THEN
        INSERT INTO public.messages (chat_id, sender_id, content)
        VALUES (v_chat_id, p_user_id, v_trimmed_message);
      END IF;
      RETURN v_chat_id;
    END IF;
  END IF;

  INSERT INTO public.chats (type, contact_name, contact_email, contact_phone, status, created_by)
  VALUES ('admin_contact', p_name, p_email, p_phone, 'open', p_user_id)
  RETURNING id INTO v_chat_id;

  IF p_user_id IS NOT NULL THEN
    INSERT INTO public.chat_participants (chat_id, user_id, role)
    VALUES (v_chat_id, p_user_id, 'user');
  END IF;

  SELECT p.id INTO v_admin_id
  FROM public.profiles p
  LEFT JOIN public.admin_profiles ap ON ap.id = p.id
  WHERE p.role IN ('admin', 'superadmin')
    AND p.is_deleted = FALSE
    AND p.status = 'active'
    AND (ap.id IS NULL OR ap.is_active = TRUE)
  ORDER BY p.created_at
  LIMIT 1;

  IF v_admin_id IS NOT NULL THEN
    INSERT INTO public.chat_participants (chat_id, user_id, role)
    VALUES (v_chat_id, v_admin_id, 'admin')
    ON CONFLICT (chat_id, user_id) DO NOTHING;

    PERFORM public.create_notification(
      v_admin_id,
      'chat_opened',
      'Nouveau contact membre',
      COALESCE(p_name, 'Visiteur') || ' a envoyé un message.',
      jsonb_build_object('chat_id', v_chat_id)
    );
  END IF;

  IF v_trimmed_message IS NOT NULL THEN
    INSERT INTO public.messages (chat_id, sender_id, content)
    VALUES (v_chat_id, p_user_id, v_trimmed_message);
  END IF;

  RETURN v_chat_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_admin_contact_chat(TEXT, TEXT, TEXT, TEXT, UUID)
  TO anon, authenticated;
