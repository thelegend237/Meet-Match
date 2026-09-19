-- ============================================================================
-- MEET & MATCH — Migration 060 : Photos visibles pour partenaire de match
-- ============================================================================
-- Bug : après match success (058), les comptes passent en inactive.
-- profiles_select_match_partner laisse lire le profil (primary_photo_url),
-- mais profile_photos_select exige status active/pending → galerie vide.
-- Même asymétrie pour un match encore actif si le partenaire est pending
-- sans photo « publique » de découverte.

DROP POLICY IF EXISTS "profile_photos_select_match_partner" ON public.profile_photos;

CREATE POLICY "profile_photos_select_match_partner"
  ON public.profile_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.matches m
      WHERE m.deleted_at IS NULL
        AND m.status IN ('pending', 'pending_payment', 'active', 'success')
        AND (
          (m.user_a_id = auth.uid() AND m.user_b_id = profile_photos.profile_id)
          OR (m.user_b_id = auth.uid() AND m.user_a_id = profile_photos.profile_id)
        )
    )
  );
