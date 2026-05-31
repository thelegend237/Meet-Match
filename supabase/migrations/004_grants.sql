-- ============================================================================
-- MEET & MATCH — Migration 004 : Grants & corrections
-- ============================================================================

-- Grants RPC pour l'application
GRANT EXECUTE ON FUNCTION public.propose_match TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_free_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_match_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_admin_contact_chat TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_age TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_user TO authenticated;

-- Vue mutual_likes : admin uniquement via RLS sous-jacent sur likes
GRANT SELECT ON public.mutual_likes TO authenticated;
GRANT SELECT ON public.visible_profiles TO authenticated;

-- Corriger policy likes INSERT (référence colonnes NEW row)
DROP POLICY IF EXISTS "likes_insert_own" ON public.likes;
CREATE POLICY "likes_insert_own"
  ON public.likes FOR INSERT
  TO authenticated
  WITH CHECK (
    from_user_id = auth.uid()
    AND public.is_active_user()
    AND from_user_id != to_user_id
  );

-- (Correction complète du trigger d'inscription : migration 008)

-- Policy : utilisateur peut s'ajouter comme participant lors d'un admin_contact
DROP POLICY IF EXISTS "chat_participants_admin_insert" ON public.chat_participants;
CREATE POLICY "chat_participants_insert_self_admin_contact"
  ON public.chat_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'user'
    AND EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = chat_id AND c.type = 'admin_contact'
    )
  );

CREATE POLICY "chat_participants_admin_insert"
  ON public.chat_participants FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());
