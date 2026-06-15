-- ============================================================================
-- MEET & MATCH — Pont schéma (Control-Flow / base partiellement migrée)
-- Exécuter AVANT 009 si diagnostic_schema.sql signale des enums/colonnes manquants
-- Sur un projet neuf : appliquer 001 → 008 à la place de ce fichier
-- ============================================================================

-- Enums (001)
DO $$ BEGIN
  CREATE TYPE public.gender_type AS ENUM ('male', 'female', 'other', 'prefer_not_say');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.relationship_type AS ENUM ('serious', 'friendship', 'marriage', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.profile_status AS ENUM ('pending', 'inactive', 'active', 'suspended', 'deleted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('unpaid', 'paid', 'failed', 'refunded', 'free');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.relation_scope AS ENUM ('local', 'national', 'international');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'superadmin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Colonnes profiles essentielles (001 + 005)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_code CHAR(2),
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS expectations TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS primary_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'gender'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN gender public.gender_type;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'relationship_type'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN relationship_type public.relationship_type;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN status public.profile_status NOT NULL DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'registration_payment_status'
  ) THEN
    BEGIN
      ALTER TABLE public.profiles
        ADD COLUMN registration_payment_status public.payment_status NOT NULL DEFAULT 'unpaid';
    EXCEPTION
      WHEN invalid_text_representation OR datatype_mismatch THEN
        ALTER TABLE public.profiles
          ADD COLUMN registration_payment_status TEXT NOT NULL DEFAULT 'unpaid';
    END;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    BEGIN
      ALTER TABLE public.profiles
        ADD COLUMN role public.user_role NOT NULL DEFAULT 'user';
    EXCEPTION
      WHEN invalid_text_representation OR datatype_mismatch THEN
        ALTER TABLE public.profiles
          ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
    END;
  END IF;
END $$;

-- Fonctions RLS (002)
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

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role::text = 'superadmin'
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

GRANT EXECUTE ON FUNCTION public.is_active_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_superadmin TO authenticated;
