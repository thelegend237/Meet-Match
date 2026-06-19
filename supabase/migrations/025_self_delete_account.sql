-- ============================================================================
-- MEET & MATCH — Migration 025 : Suppression de compte par l'utilisateur
-- ============================================================================
-- Renforce soft_delete_user pour l'auto-suppression (dernier superadmin, etc.).

CREATE OR REPLACE FUNCTION public.soft_delete_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target public.profiles%ROWTYPE;
  v_superadmin_count INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF auth.uid() != p_user_id AND NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Unauthorized';
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
  WHERE status IN ('active', 'pending', 'pending_payment')
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
    CASE
      WHEN auth.uid() = p_user_id THEN
        'Votre compte a été supprimé à votre demande.'
      ELSE
        'Votre compte a été supprimé par un administrateur.'
    END,
    jsonb_build_object(
      'self_delete', auth.uid() = p_user_id,
      'deleted_by', auth.uid()
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_user(UUID) TO authenticated;
