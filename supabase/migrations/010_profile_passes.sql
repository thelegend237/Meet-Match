-- ============================================================================
-- MEET & MATCH — Migration 010 : Pass / masquer des profils en découverte
--
-- PRÉREQUIS : 001 (profiles), 002 ou 000_schema_bridge (is_admin, is_active_user)
-- Les fonctions ci-dessous sont recréées si absentes (base partiellement migrée).
-- ============================================================================

-- Pont colonnes profiles (001) — requis par is_admin / is_active_user
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'superadmin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS role public.user_role NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS registration_payment_status TEXT NOT NULL DEFAULT 'unpaid';

-- Pont 002 : helpers RLS (politiques profile_passes)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role::text IN ('admin', 'superadmin')
      AND is_deleted = FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_deleted = FALSE
      AND status::text = 'active'
      AND registration_payment_status::text IN ('paid', 'free')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_user TO authenticated;

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profile_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profile_passes_no_self CHECK (from_user_id != to_user_id),
  CONSTRAINT profile_passes_unique_pair UNIQUE (from_user_id, to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_passes_from_user
  ON public.profile_passes (from_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_passes_to_user
  ON public.profile_passes (to_user_id);

ALTER TABLE public.profile_passes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_passes_select_own" ON public.profile_passes;
CREATE POLICY "profile_passes_select_own"
  ON public.profile_passes FOR SELECT
  TO authenticated
  USING (from_user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "profile_passes_insert_own" ON public.profile_passes;
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

DROP POLICY IF EXISTS "profile_passes_admin_delete" ON public.profile_passes;
CREATE POLICY "profile_passes_admin_delete"
  ON public.profile_passes FOR DELETE
  TO authenticated
  USING (public.is_admin());
