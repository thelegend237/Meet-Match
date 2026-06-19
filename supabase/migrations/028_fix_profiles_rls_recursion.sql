-- ============================================================================
-- MEET & MATCH — Migration 028 : Corriger la récursion RLS sur profiles
-- ============================================================================
-- Symptôme : "Infinite recursion detected in policy for relation profiles"
-- Cause : policies profiles → can_browse_discovery() / profile_has_discovery_photo()
--         → SELECT sur profiles → réévaluation des policies.
-- Fix : SET row_security = off sur les helpers SECURITY DEFINER + policy UPDATE.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
      AND is_deleted = FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'superadmin'
      AND is_deleted = FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_deleted = FALSE
      AND (
        role IN ('admin', 'superadmin')
        OR (
          status = 'active'
          AND registration_payment_status IN ('paid', 'free')
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_browse_discovery()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_deleted = FALSE
      AND status IN ('active', 'pending')
      AND role IN ('user', 'admin', 'superadmin')
  );
$$;

CREATE OR REPLACE FUNCTION public.profile_has_discovery_photo(p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE pr.id = p_profile_id
      AND pr.primary_photo_url IS NOT NULL
      AND trim(pr.primary_photo_url) != ''
  )
  OR EXISTS (
    SELECT 1
    FROM public.profile_photos ph
    WHERE ph.profile_id = p_profile_id
  );
$$;

CREATE OR REPLACE FUNCTION public.profile_role_change_allowed(p_new_role public.user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = p_new_role
  );
$$;

GRANT EXECUTE ON FUNCTION public.profile_role_change_allowed(public.user_role) TO authenticated;

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() AND is_deleted = FALSE)
  WITH CHECK (
    id = auth.uid()
    AND public.profile_role_change_allowed(role)
    AND is_deleted = FALSE
  );
