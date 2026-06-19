-- ============================================================================
-- MEET & MATCH — Migration 019 : Suppression de profil par superadmin
-- ============================================================================

-- Restreindre la suppression d'un autre compte aux superadmin uniquement
CREATE OR REPLACE FUNCTION public.soft_delete_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() != p_user_id AND NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.profiles
  SET
    is_deleted = TRUE,
    status = 'deleted',
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;

  UPDATE public.matches
  SET status = 'failed', closed_at = NOW(), updated_at = NOW()
  WHERE status = 'active'
    AND (user_a_id = p_user_id OR user_b_id = p_user_id);

  UPDATE public.chats c
  SET status = 'closed', closed_at = NOW()
  WHERE c.status = 'open'
    AND EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = c.id AND cp.user_id = p_user_id
    );

  UPDATE public.admin_profiles
  SET is_active = FALSE, updated_at = NOW()
  WHERE id = p_user_id;

  PERFORM public.create_notification(
    p_user_id,
    'account_deleted',
    'Compte supprimé',
    'Votre compte a été supprimé.',
    '{}'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_user(
  p_superadmin_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor public.profiles%ROWTYPE;
  v_target public.profiles%ROWTYPE;
  v_superadmin_count INT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_superadmin_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_actor FROM public.profiles WHERE id = p_superadmin_id;
  IF NOT FOUND OR v_actor.role != 'superadmin' OR v_actor.is_deleted THEN
    RAISE EXCEPTION 'Unauthorized: superadmin only';
  END IF;

  IF p_superadmin_id = p_user_id THEN
    RAISE EXCEPTION 'Cannot delete your own account from admin';
  END IF;

  SELECT * INTO v_target
  FROM public.profiles
  WHERE id = p_user_id AND is_deleted = FALSE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_target.role = 'superadmin' THEN
    SELECT COUNT(*) INTO v_superadmin_count
    FROM public.profiles
    WHERE role = 'superadmin' AND is_deleted = FALSE;

    IF v_superadmin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot delete the last superadmin';
    END IF;
  END IF;

  UPDATE public.profiles
  SET
    is_deleted = TRUE,
    status = 'deleted',
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;

  UPDATE public.matches
  SET status = 'failed', closed_at = NOW(), updated_at = NOW()
  WHERE status = 'active'
    AND (user_a_id = p_user_id OR user_b_id = p_user_id);

  UPDATE public.chats c
  SET status = 'closed', closed_at = NOW()
  WHERE c.status = 'open'
    AND EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = c.id AND cp.user_id = p_user_id
    );

  UPDATE public.admin_profiles
  SET is_active = FALSE, updated_at = NOW()
  WHERE id = p_user_id;

  PERFORM public.create_notification(
    p_user_id,
    'account_deleted',
    'Compte supprimé',
    'Votre compte a été supprimé par un administrateur.',
    jsonb_build_object('deleted_by', p_superadmin_id)
  );

  PERFORM public.log_admin_action(
    p_superadmin_id,
    'delete_user',
    'profile',
    p_user_id,
    jsonb_build_object(
      'display_name', v_target.display_name,
      'email', v_target.email,
      'previous_role', v_target.role
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID, UUID) TO authenticated;
