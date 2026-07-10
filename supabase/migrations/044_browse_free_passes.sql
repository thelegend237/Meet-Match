-- ============================================================================
-- MEET & MATCH — Migration 044 : Passer un profil en mode parcours (browse-free)
-- ============================================================================
-- Les membres non activés peuvent parcourir et passer des profils ;
-- liker reste réservé aux comptes payés / gratuits (is_active_user).

DROP POLICY IF EXISTS "profile_passes_insert_own" ON public.profile_passes;
CREATE POLICY "profile_passes_insert_own"
  ON public.profile_passes FOR INSERT
  TO authenticated
  WITH CHECK (
    from_user_id = auth.uid()
    AND public.can_browse_discovery()
    AND NOT EXISTS (
      SELECT 1 FROM public.profile_passes pp
      WHERE pp.from_user_id = auth.uid() AND pp.to_user_id = profile_passes.to_user_id
    )
  );
