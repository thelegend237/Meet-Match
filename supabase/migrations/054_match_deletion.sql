-- ============================================================================
-- MEET & MATCH — Migration 054 : Masquage & suppression des matchs
--
-- Admin      : suppression logique (matches.deleted_at)
-- Superadmin : suppression définitive (DELETE)
-- ============================================================================

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_matches_not_deleted
  ON public.matches (proposed_at DESC)
  WHERE deleted_at IS NULL;

-- Masquer un match (admin / superadmin)
CREATE OR REPLACE FUNCTION public.admin_soft_delete_match(p_match_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.matches%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  SELECT * INTO v_match
  FROM public.matches
  WHERE id = p_match_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match introuvable ou déjà masqué';
  END IF;

  UPDATE public.matches
  SET
    deleted_at = NOW(),
    deleted_by = auth.uid(),
    status = CASE
      WHEN status IN ('success', 'failed', 'cancelled') THEN status
      ELSE 'cancelled'
    END,
    closed_at = COALESCE(closed_at, NOW()),
    updated_at = NOW()
  WHERE id = p_match_id;

  IF v_match.chat_id IS NOT NULL THEN
    UPDATE public.chats
    SET
      status = 'closed',
      closed_at = COALESCE(closed_at, NOW())
    WHERE id = v_match.chat_id
      AND deleted_at IS NULL;
  END IF;

  PERFORM public.log_admin_action(
    auth.uid(),
    'soft_delete_match',
    'match',
    p_match_id,
    jsonb_build_object(
      'previous_status', v_match.status,
      'user_a_id', v_match.user_a_id,
      'user_b_id', v_match.user_b_id
    )
  );
END;
$$;

-- Suppression définitive (superadmin)
CREATE OR REPLACE FUNCTION public.superadmin_hard_delete_match(p_match_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.matches%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Unauthorized: superadmin only';
  END IF;

  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match introuvable';
  END IF;

  PERFORM public.log_admin_action(
    auth.uid(),
    'hard_delete_match',
    'match',
    p_match_id,
    jsonb_build_object(
      'status', v_match.status,
      'was_deleted', v_match.deleted_at IS NOT NULL,
      'user_a_id', v_match.user_a_id,
      'user_b_id', v_match.user_b_id
    )
  );

  DELETE FROM public.matches WHERE id = p_match_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_soft_delete_match(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.superadmin_hard_delete_match(UUID) TO authenticated;

-- Interdire la modification d'un match masqué (sauf superadmin via hard delete)
CREATE OR REPLACE FUNCTION public.update_match_status(
  p_admin_id UUID,
  p_match_id UUID,
  p_status public.match_status,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m public.matches%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  SELECT * INTO m
  FROM public.matches
  WHERE id = p_match_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  UPDATE public.matches
  SET
    status = p_status,
    outcome_note = COALESCE(p_note, outcome_note),
    closed_at = CASE
      WHEN p_status IN ('success', 'failed', 'cancelled') THEN NOW()
      ELSE closed_at
    END,
    updated_at = NOW()
  WHERE id = p_match_id;

  IF p_status = 'success' THEN
    PERFORM public.create_notification(
      m.user_a_id, 'match_success', 'Match réussi',
      'Félicitations. Votre mise en relation a été finalisée.',
      jsonb_build_object('match_id', p_match_id)
    );
    PERFORM public.create_notification(
      m.user_b_id, 'match_success', 'Match réussi',
      'Félicitations. Votre mise en relation a été finalisée.',
      jsonb_build_object('match_id', p_match_id)
    );
  ELSIF p_status = 'failed' THEN
    PERFORM public.create_notification(
      m.user_a_id, 'match_failed', 'Match échoué',
      'Ce match n''a pas abouti, mais nous continuons à chercher pour vous.',
      jsonb_build_object('match_id', p_match_id)
    );
    PERFORM public.create_notification(
      m.user_b_id, 'match_failed', 'Match échoué',
      'Ce match n''a pas abouti, mais nous continuons à chercher pour vous.',
      jsonb_build_object('match_id', p_match_id)
    );
  END IF;

  IF p_status IN ('success', 'failed', 'cancelled') AND m.chat_id IS NOT NULL THEN
    UPDATE public.chats
    SET status = 'closed', closed_at = COALESCE(closed_at, NOW())
    WHERE id = m.chat_id;
  END IF;

  PERFORM public.log_admin_action(
    p_admin_id,
    'update_match_status',
    'match',
    p_match_id,
    jsonb_build_object('status', p_status)
  );
END;
$$;

DROP POLICY IF EXISTS "matches_select_participant" ON public.matches;

CREATE POLICY "matches_select_participant"
  ON public.matches FOR SELECT
  TO authenticated
  USING (
    (
      user_a_id = auth.uid()
      OR user_b_id = auth.uid()
      OR public.is_admin()
    )
    AND (deleted_at IS NULL OR public.is_superadmin())
  );
