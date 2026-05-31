-- ============================================================================
-- MEET & MATCH — Migration 010 : Pass / masquer des profils en découverte
-- ============================================================================

CREATE TABLE public.profile_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profile_passes_no_self CHECK (from_user_id != to_user_id),
  CONSTRAINT profile_passes_unique_pair UNIQUE (from_user_id, to_user_id)
);

CREATE INDEX idx_profile_passes_from_user
  ON public.profile_passes (from_user_id, created_at DESC);

CREATE INDEX idx_profile_passes_to_user
  ON public.profile_passes (to_user_id);

ALTER TABLE public.profile_passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_passes_select_own"
  ON public.profile_passes FOR SELECT
  TO authenticated
  USING (from_user_id = auth.uid() OR public.is_admin());

CREATE POLICY "profile_passes_insert_own"
  ON public.profile_passes FOR INSERT
  TO authenticated
  WITH CHECK (
    from_user_id = auth.uid()
    AND public.is_active_user()
    AND from_user_id != to_user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.profile_passes pp
      WHERE pp.from_user_id = auth.uid() AND pp.to_user_id = profile_passes.to_user_id
    )
  );

CREATE POLICY "profile_passes_admin_delete"
  ON public.profile_passes FOR DELETE
  TO authenticated
  USING (public.is_admin());
