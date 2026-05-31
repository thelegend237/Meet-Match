-- ============================================================================
-- MEET & MATCH — Migration 001 : Schéma initial
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'superadmin');

CREATE TYPE public.profile_status AS ENUM (
  'pending',
  'inactive',
  'active',
  'suspended',
  'deleted'
);

CREATE TYPE public.gender_type AS ENUM (
  'male',
  'female',
  'other',
  'prefer_not_say'
);

CREATE TYPE public.relationship_type AS ENUM (
  'serious',
  'friendship',
  'marriage',
  'other'
);

CREATE TYPE public.relation_scope AS ENUM (
  'local',
  'national',
  'international'
);

CREATE TYPE public.payment_type AS ENUM ('registration', 'matching');

CREATE TYPE public.payment_status AS ENUM (
  'unpaid',
  'paid',
  'failed',
  'refunded',
  'free'
);

CREATE TYPE public.payment_provider AS ENUM (
  'stripe',
  'flutterwave',
  'cinetpay',
  'manual'
);

CREATE TYPE public.match_status AS ENUM (
  'pending',
  'pending_payment',
  'active',
  'success',
  'failed',
  'cancelled'
);

CREATE TYPE public.chat_type AS ENUM ('admin_contact', 'match_group');

CREATE TYPE public.chat_status AS ENUM ('open', 'closed');

CREATE TYPE public.participant_role AS ENUM ('user', 'admin', 'guest');

CREATE TYPE public.free_access_type AS ENUM ('registration', 'matching', 'full');

CREATE TYPE public.notification_type AS ENUM (
  'account_created',
  'profile_incomplete',
  'like_sent',
  'match_proposed',
  'matching_payment_required',
  'payment_confirmed',
  'chat_opened',
  'match_success',
  'match_failed',
  'account_deleted'
);

-- ============================================================================
-- HELPER : updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- TABLE : profiles (extension de auth.users)
-- ============================================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  phone TEXT,
  date_of_birth DATE,
  gender public.gender_type,
  country_code CHAR(2),
  city TEXT,
  language TEXT DEFAULT 'fr',
  timezone TEXT DEFAULT 'Europe/Paris',
  bio TEXT,
  expectations TEXT,
  relationship_type public.relationship_type,
  preferred_age_min INT CHECK (preferred_age_min IS NULL OR preferred_age_min >= 18),
  preferred_age_max INT CHECK (preferred_age_max IS NULL OR preferred_age_max <= 120),
  preferred_country_code CHAR(2),
  preferred_city TEXT,
  preferred_relation_scope public.relation_scope,
  primary_photo_url TEXT,
  status public.profile_status NOT NULL DEFAULT 'pending',
  profile_completion INT NOT NULL DEFAULT 0 CHECK (profile_completion >= 0 AND profile_completion <= 100),
  registration_payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  role public.user_role NOT NULL DEFAULT 'user',
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profiles_email_unique UNIQUE (email),
  CONSTRAINT profiles_phone_unique UNIQUE (phone),
  CONSTRAINT profiles_age_range_valid CHECK (
    preferred_age_min IS NULL
    OR preferred_age_max IS NULL
    OR preferred_age_min <= preferred_age_max
  )
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_profiles_country ON public.profiles (country_code);
CREATE INDEX idx_profiles_city ON public.profiles (city);
CREATE INDEX idx_profiles_status ON public.profiles (status);
CREATE INDEX idx_profiles_active_visible ON public.profiles (status, is_deleted)
  WHERE is_deleted = FALSE AND status = 'active';
CREATE INDEX idx_profiles_role ON public.profiles (role);
CREATE INDEX idx_profiles_registration_payment ON public.profiles (registration_payment_status);

-- ============================================================================
-- TABLE : profile_photos
-- ============================================================================

CREATE TABLE public.profile_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profile_photos_profile_id ON public.profile_photos (profile_id);
CREATE UNIQUE INDEX idx_profile_photos_one_primary
  ON public.profile_photos (profile_id)
  WHERE is_primary = TRUE;

-- ============================================================================
-- TABLE : admin_profiles (métadonnées admin)
-- ============================================================================

CREATE TABLE public.admin_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER admin_profiles_updated_at
  BEFORE UPDATE ON public.admin_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- TABLE : likes
-- ============================================================================

CREATE TABLE public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT likes_no_self CHECK (from_user_id != to_user_id),
  CONSTRAINT likes_unique_pair UNIQUE (from_user_id, to_user_id)
);

CREATE INDEX idx_likes_from_user_id ON public.likes (from_user_id);
CREATE INDEX idx_likes_to_user_id ON public.likes (to_user_id);
CREATE INDEX idx_likes_created_at ON public.likes (created_at DESC);

-- ============================================================================
-- TABLE : matches
-- ============================================================================

CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  user_b_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status public.match_status NOT NULL DEFAULT 'pending_payment',
  proposed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  proposed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  outcome_note TEXT,
  chat_id UUID, -- FK ajoutée après création de chats
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT matches_ordered_users CHECK (user_a_id < user_b_id),
  CONSTRAINT matches_different_users CHECK (user_a_id != user_b_id)
);

CREATE TRIGGER matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_matches_user_a_id ON public.matches (user_a_id);
CREATE INDEX idx_matches_user_b_id ON public.matches (user_b_id);
CREATE INDEX idx_matches_status ON public.matches (status);
CREATE INDEX idx_matches_proposed_by ON public.matches (proposed_by);

-- ============================================================================
-- TABLE : payments
-- ============================================================================

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  type public.payment_type NOT NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  status public.payment_status NOT NULL DEFAULT 'unpaid',
  provider public.payment_provider NOT NULL DEFAULT 'stripe',
  provider_reference TEXT,
  stripe_session_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_payments_user_id ON public.payments (user_id);
CREATE INDEX idx_payments_match_id ON public.payments (match_id);
CREATE INDEX idx_payments_type_status ON public.payments (type, status);
CREATE INDEX idx_payments_stripe_session ON public.payments (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

-- ============================================================================
-- TABLE : free_accesses
-- ============================================================================

CREATE TABLE public.free_accesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  access_type public.free_access_type NOT NULL,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_free_accesses_user_id ON public.free_accesses (user_id);
CREATE INDEX idx_free_accesses_match_id ON public.free_accesses (match_id);

-- ============================================================================
-- TABLE : chats
-- ============================================================================

CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.chat_type NOT NULL,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  subject TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  status public.chat_status NOT NULL DEFAULT 'open',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX idx_chats_match_id ON public.chats (match_id);
CREATE INDEX idx_chats_type ON public.chats (type);
CREATE INDEX idx_chats_status ON public.chats (status);

-- FK matches.chat_id → chats
ALTER TABLE public.matches
  ADD CONSTRAINT matches_chat_id_fkey
  FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE SET NULL;

-- ============================================================================
-- TABLE : chat_participants
-- ============================================================================

CREATE TABLE public.chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.participant_role NOT NULL DEFAULT 'user',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chat_participants_unique UNIQUE (chat_id, user_id)
);

CREATE INDEX idx_chat_participants_chat_id ON public.chat_participants (chat_id);
CREATE INDEX idx_chat_participants_user_id ON public.chat_participants (user_id);

-- ============================================================================
-- TABLE : messages
-- ============================================================================

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL CHECK (char_length(trim(content)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX idx_messages_chat_id_created ON public.messages (chat_id, created_at);
CREATE INDEX idx_messages_sender_id ON public.messages (sender_id);

-- ============================================================================
-- TABLE : notifications
-- ============================================================================

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread
  ON public.notifications (user_id, is_read, created_at DESC);

-- ============================================================================
-- TABLE : admin_logs
-- ============================================================================

CREATE TABLE public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_logs_admin_id ON public.admin_logs (admin_id);
CREATE INDEX idx_admin_logs_entity ON public.admin_logs (entity_type, entity_id);
CREATE INDEX idx_admin_logs_created_at ON public.admin_logs (created_at DESC);

-- ============================================================================
-- TABLE : app_settings
-- ============================================================================

CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- VUES UTILES
-- ============================================================================

-- Âge calculé depuis date_of_birth
CREATE OR REPLACE FUNCTION public.get_profile_age(dob DATE)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN dob IS NULL THEN NULL
    ELSE EXTRACT(YEAR FROM age(dob))::INT
  END;
$$;

-- Likes réciproques (pour dashboard admin)
CREATE OR REPLACE VIEW public.mutual_likes AS
SELECT
  LEAST(l1.from_user_id, l1.to_user_id) AS user_a_id,
  GREATEST(l1.from_user_id, l1.to_user_id) AS user_b_id,
  GREATEST(l1.created_at, l2.created_at) AS mutual_at
FROM public.likes l1
JOIN public.likes l2
  ON l1.from_user_id = l2.to_user_id
  AND l1.to_user_id = l2.from_user_id
WHERE l1.from_user_id < l1.to_user_id;

-- Profils publics visibles (actifs, non supprimés, photo principale)
CREATE OR REPLACE VIEW public.visible_profiles AS
SELECT
  p.*,
  public.get_profile_age(p.date_of_birth) AS age
FROM public.profiles p
WHERE p.is_deleted = FALSE
  AND p.status = 'active'
  AND p.primary_photo_url IS NOT NULL
  AND p.registration_payment_status IN ('paid', 'free');
