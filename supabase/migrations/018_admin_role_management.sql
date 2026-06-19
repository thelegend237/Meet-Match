-- ============================================================================
-- MEET & MATCH — Migration 018 : Gestion des rôles depuis l'admin
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_user_role(
  p_admin_id UUID,
  p_user_id UUID,
  p_role public.user_role
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
  IF auth.uid() IS NULL OR auth.uid() != p_admin_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_actor FROM public.profiles WHERE id = p_admin_id;
  IF NOT FOUND OR v_actor.role NOT IN ('admin', 'superadmin') THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  IF p_admin_id = p_user_id THEN
    RAISE EXCEPTION 'Cannot change your own role';
  END IF;

  SELECT * INTO v_target
  FROM public.profiles
  WHERE id = p_user_id AND is_deleted = FALSE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF p_role = 'superadmin' AND v_actor.role != 'superadmin' THEN
    RAISE EXCEPTION 'Only superadmin can assign superadmin role';
  END IF;

  IF v_target.role = 'superadmin' AND v_actor.role != 'superadmin' THEN
    RAISE EXCEPTION 'Only superadmin can modify a superadmin';
  END IF;

  IF v_target.role = 'superadmin' AND p_role != 'superadmin' THEN
    SELECT COUNT(*) INTO v_superadmin_count
    FROM public.profiles
    WHERE role = 'superadmin' AND is_deleted = FALSE;

    IF v_superadmin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot demote the last superadmin';
    END IF;
  END IF;

  UPDATE public.profiles
  SET role = p_role, updated_at = NOW()
  WHERE id = p_user_id;

  IF p_role IN ('admin', 'superadmin') THEN
    INSERT INTO public.admin_profiles (id, title, is_active)
    VALUES (
      p_user_id,
      CASE WHEN p_role = 'superadmin' THEN 'Super administrateur' ELSE 'Administrateur' END,
      TRUE
    )
    ON CONFLICT (id) DO UPDATE SET
      is_active = TRUE,
      title = EXCLUDED.title,
      updated_at = NOW();
  ELSE
    UPDATE public.admin_profiles
    SET is_active = FALSE, updated_at = NOW()
    WHERE id = p_user_id;
  END IF;

  PERFORM public.log_admin_action(
    p_admin_id,
    'update_user_role',
    'profile',
    p_user_id,
    jsonb_build_object(
      'previous_role', v_target.role,
      'new_role', p_role
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_role(UUID, UUID, public.user_role) TO authenticated;
