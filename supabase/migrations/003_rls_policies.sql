-- ============================================================================
-- MEET & MATCH — Migration 003 : Row Level Security
-- ============================================================================

-- Activer RLS sur toutes les tables sensibles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_accesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES
-- ============================================================================

-- Utilisateur lit son propre profil
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin());

-- Profils publics visibles (utilisateurs actifs)
CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.is_active_user()
    AND is_deleted = FALSE
    AND status = 'active'
    AND primary_photo_url IS NOT NULL
    AND registration_payment_status IN ('paid', 'free')
    AND id != auth.uid()
  );

-- Utilisateur modifie son propre profil (pas role/status/is_deleted)
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() AND is_deleted = FALSE)
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    AND is_deleted = FALSE
  );

-- Admin modifie tous les profils
CREATE POLICY "profiles_admin_all"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- PROFILE_PHOTOS
-- ============================================================================

CREATE POLICY "profile_photos_select"
  ON public.profile_photos FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_photos.profile_id
        AND p.is_deleted = FALSE
        AND p.status = 'active'
        AND p.primary_photo_url IS NOT NULL
    )
  );

CREATE POLICY "profile_photos_insert_own"
  ON public.profile_photos FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "profile_photos_update_own"
  ON public.profile_photos FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "profile_photos_delete_own"
  ON public.profile_photos FOR DELETE
  TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin());

-- ============================================================================
-- ADMIN_PROFILES
-- ============================================================================

CREATE POLICY "admin_profiles_select"
  ON public.admin_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "admin_profiles_manage"
  ON public.admin_profiles FOR ALL
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- ============================================================================
-- LIKES
-- ============================================================================

CREATE POLICY "likes_select_own"
  ON public.likes FOR SELECT
  TO authenticated
  USING (
    from_user_id = auth.uid()
    OR to_user_id = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY "likes_insert_own"
  ON public.likes FOR INSERT
  TO authenticated
  WITH CHECK (
    from_user_id = auth.uid()
    AND public.is_active_user()
    AND from_user_id != to_user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.likes l
      WHERE l.from_user_id = auth.uid() AND l.to_user_id = likes.to_user_id
    )
  );

-- Pas de UPDATE/DELETE likes pour utilisateurs (intégrité)
CREATE POLICY "likes_admin_delete"
  ON public.likes FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- MATCHES
-- ============================================================================

CREATE POLICY "matches_select_participant"
  ON public.matches FOR SELECT
  TO authenticated
  USING (
    user_a_id = auth.uid()
    OR user_b_id = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY "matches_admin_manage"
  ON public.matches FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- PAYMENTS
-- ============================================================================

CREATE POLICY "payments_select_own"
  ON public.payments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "payments_insert_own_unpaid"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'unpaid'
    AND type = 'registration'
  );

CREATE POLICY "payments_admin_manage"
  ON public.payments FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- FREE_ACCESSES
-- ============================================================================

CREATE POLICY "free_accesses_select_own"
  ON public.free_accesses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "free_accesses_admin_manage"
  ON public.free_accesses FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- CHATS — RÈGLE CRITIQUE : users ne créent PAS de chat entre eux
-- ============================================================================

CREATE POLICY "chats_select_participant"
  ON public.chats FOR SELECT
  TO authenticated
  USING (
    public.is_chat_participant(id)
    OR public.is_admin()
  );

-- Utilisateurs : uniquement admin_contact via fonction (pas INSERT direct match_group)
CREATE POLICY "chats_insert_admin_contact"
  ON public.chats FOR INSERT
  TO authenticated
  WITH CHECK (
    type = 'admin_contact'
    AND match_id IS NULL
  );

CREATE POLICY "chats_admin_manage"
  ON public.chats FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Anonymes (visiteurs) : contact admin via service role / edge function uniquement
-- Pas de policy anon INSERT direct sur chats en MVP

-- ============================================================================
-- CHAT_PARTICIPANTS
-- ============================================================================

CREATE POLICY "chat_participants_select"
  ON public.chat_participants FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_chat_participant(chat_id)
    OR public.is_admin()
  );

-- Seuls admins/système ajoutent participants (match_group)
CREATE POLICY "chat_participants_admin_insert"
  ON public.chat_participants FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "chat_participants_admin_manage"
  ON public.chat_participants FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- MESSAGES
-- ============================================================================

CREATE POLICY "messages_select_participant"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    public.is_chat_participant(chat_id)
    OR public.is_admin()
  );

CREATE POLICY "messages_insert_participant"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_chat_participant(chat_id)
    AND EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = messages.chat_id
        AND c.status = 'open'
        AND (
          c.type = 'admin_contact'
          OR (
            c.type = 'match_group'
            AND EXISTS (
              SELECT 1 FROM public.matches m
              WHERE m.chat_id = c.id AND m.status = 'active'
            )
          )
        )
    )
  );

CREATE POLICY "messages_admin_manage"
  ON public.messages FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Insert via fonctions SECURITY DEFINER uniquement

-- ============================================================================
-- ADMIN_LOGS
-- ============================================================================

CREATE POLICY "admin_logs_select"
  ON public.admin_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Insert via fonctions SECURITY DEFINER

-- ============================================================================
-- APP_SETTINGS
-- ============================================================================

CREATE POLICY "app_settings_select_all"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "app_settings_superadmin_manage"
  ON public.app_settings FOR ALL
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- ============================================================================
-- STORAGE (bucket profile-photos) — à exécuter via dashboard ou migration storage
-- ============================================================================

-- Note : créer le bucket 'profile-photos' dans Supabase Dashboard
-- Policies storage recommandées :
--
-- SELECT : authenticated users can read photos of visible profiles
-- INSERT : user can upload to folder {user_id}/*
-- UPDATE/DELETE : user owns folder or admin

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "storage_profile_photos_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'profile-photos');

CREATE POLICY "storage_profile_photos_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "storage_profile_photos_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "storage_profile_photos_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

-- Lecture publique des photos (pour affichage profils)
CREATE POLICY "storage_profile_photos_public_read"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'profile-photos');

-- ============================================================================
-- REALTIME — activer sur messages
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
