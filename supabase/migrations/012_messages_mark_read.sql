-- ============================================================================
-- MEET & MATCH — Migration 012 : Marquer les messages reçus comme lus
--
-- Crée le minimum messaging manquant (base partiellement migrée type Control-Flow).
-- Sur un projet neuf : 001 → 003 puis cette migration.
-- ============================================================================

-- Enums messaging (001)
DO $$ BEGIN
  CREATE TYPE public.chat_type AS ENUM ('admin_contact', 'match_group');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.chat_status AS ENUM ('open', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.participant_role AS ENUM ('user', 'admin', 'guest');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- chats
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.chat_type NOT NULL,
  match_id UUID,
  subject TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  status public.chat_status NOT NULL DEFAULT 'open',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_chats_match_id ON public.chats (match_id);
CREATE INDEX IF NOT EXISTS idx_chats_type ON public.chats (type);
CREATE INDEX IF NOT EXISTS idx_chats_status ON public.chats (status);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'matches'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chats_match_id_fkey'
  ) THEN
    ALTER TABLE public.chats
      ADD CONSTRAINT chats_match_id_fkey
      FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE SET NULL;
  END IF;
END $$;

-- chat_participants
CREATE TABLE IF NOT EXISTS public.chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.participant_role NOT NULL DEFAULT 'user',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chat_participants_unique UNIQUE (chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id
  ON public.chat_participants (chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id
  ON public.chat_participants (user_id);

-- messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL CHECK (char_length(trim(content)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created
  ON public.messages (chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id
  ON public.messages (sender_id);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Helper (002) — recréé après création de chat_participants
CREATE OR REPLACE FUNCTION public.is_chat_participant(p_chat_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_id = p_chat_id
      AND user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_chat_participant TO authenticated;

DROP POLICY IF EXISTS "messages_update_mark_read" ON public.messages;

CREATE POLICY "messages_update_mark_read"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (
    sender_id <> auth.uid()
    AND public.is_chat_participant(chat_id)
  )
  WITH CHECK (
    sender_id <> auth.uid()
    AND public.is_chat_participant(chat_id)
  );
