-- ============================================================================
-- MEET & MATCH — Migration 002 : Fonctions métier & triggers
-- ============================================================================

-- ============================================================================
-- HELPERS RLS
-- ============================================================================

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
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
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
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_deleted = FALSE
      AND status = 'active'
      AND registration_payment_status IN ('paid', 'free')
  );
$$;

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

CREATE OR REPLACE FUNCTION public.is_match_participant(p_match_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matches
    WHERE id = p_match_id
      AND (user_a_id = auth.uid() OR user_b_id = auth.uid())
  );
$$;

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type public.notification_type,
  p_title TEXT,
  p_content TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, content, metadata)
  VALUES (p_user_id, p_type, p_title, p_content, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============================================================================
-- ADMIN LOG
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_admin_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_payload JSONB DEFAULT '{}',
  p_ip_address INET DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.admin_logs (admin_id, action, entity_type, entity_id, payload, ip_address)
  VALUES (p_admin_id, p_action, p_entity_type, p_entity_id, p_payload, p_ip_address)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============================================================================
-- CALCUL COMPLÉTION PROFIL
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_profile_completion(p_profile_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.profiles%ROWTYPE;
  score INT := 0;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = p_profile_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- Identité (15%)
  IF p.display_name IS NOT NULL AND trim(p.display_name) != '' THEN score := score + 5; END IF;
  IF p.date_of_birth IS NOT NULL THEN score := score + 5; END IF;
  IF p.gender IS NOT NULL THEN score := score + 5; END IF;

  -- Localisation (15%)
  IF p.country_code IS NOT NULL THEN score := score + 8; END IF;
  IF p.city IS NOT NULL AND trim(p.city) != '' THEN score := score + 7; END IF;

  -- Présentation (15%)
  IF p.bio IS NOT NULL AND char_length(trim(p.bio)) >= 20 THEN score := score + 15; END IF;

  -- Attentes (15%)
  IF p.expectations IS NOT NULL AND char_length(trim(p.expectations)) >= 10 THEN score := score + 8; END IF;
  IF p.relationship_type IS NOT NULL THEN score := score + 7; END IF;

  -- Préférences (15%)
  IF p.preferred_age_min IS NOT NULL AND p.preferred_age_max IS NOT NULL THEN score := score + 8; END IF;
  IF p.preferred_relation_scope IS NOT NULL THEN score := score + 7; END IF;

  -- Photo (15%)
  IF p.primary_photo_url IS NOT NULL AND trim(p.primary_photo_url) != '' THEN score := score + 15; END IF;

  -- Compléments (10%)
  IF p.language IS NOT NULL THEN score := score + 5; END IF;
  IF p.phone IS NOT NULL AND trim(p.phone) != '' THEN score := score + 5; END IF;

  RETURN LEAST(score, 100);
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_recalculate_profile_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_score INT;
BEGIN
  new_score := public.calculate_profile_completion(NEW.id);
  NEW.profile_completion := new_score;

  IF new_score < 80 AND NEW.status = 'active' THEN
    PERFORM public.create_notification(
      NEW.id,
      'profile_incomplete',
      'Profil incomplet',
      'Complétez votre profil pour augmenter vos chances de match.',
      jsonb_build_object('completion', new_score)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_recalculate_completion
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_profile_completion();

-- Sync primary photo from profile_photos
CREATE OR REPLACE FUNCTION public.sync_primary_photo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_primary = TRUE THEN
    UPDATE public.profiles
    SET primary_photo_url = NEW.url, updated_at = NOW()
    WHERE id = NEW.profile_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profile_photos_sync_primary
  AFTER INSERT OR UPDATE ON public.profile_photos
  FOR EACH ROW
  WHEN (NEW.is_primary = TRUE)
  EXECUTE FUNCTION public.sync_primary_photo();

-- ============================================================================
-- CRÉATION PROFIL À L'INSCRIPTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    phone,
    country_code,
    city
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'country_code',
    NEW.raw_user_meta_data->>'city'
  );

  PERFORM public.create_notification(
    NEW.id,
    'account_created',
    'Bienvenue sur Meet & Match',
    'Votre compte a été créé. Complétez votre profil pour commencer.',
    '{}'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- PAIEMENT MATCHING — vérification double paiement
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_has_matching_access(
  p_user_id UUID,
  p_match_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Accès gratuit full ou matching spécifique
  IF EXISTS (
    SELECT 1 FROM public.free_accesses fa
    WHERE fa.user_id = p_user_id
      AND fa.access_type IN ('full', 'matching')
      AND (fa.match_id IS NULL OR fa.match_id = p_match_id)
      AND (fa.expires_at IS NULL OR fa.expires_at > NOW())
  ) THEN
    RETURN TRUE;
  END IF;

  -- Paiement matching payé
  IF EXISTS (
    SELECT 1 FROM public.payments pay
    WHERE pay.user_id = p_user_id
      AND pay.match_id = p_match_id
      AND pay.type = 'matching'
      AND pay.status IN ('paid', 'free')
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_match_payment_status(p_match_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m public.matches%ROWTYPE;
  admin_id UUID;
  new_chat_id UUID;
  user_a_name TEXT;
  user_b_name TEXT;
BEGIN
  SELECT * INTO m FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND OR m.status != 'pending_payment' THEN
    RETURN;
  END IF;

  IF NOT (
    public.user_has_matching_access(m.user_a_id, p_match_id)
    AND public.user_has_matching_access(m.user_b_id, p_match_id)
  ) THEN
    RETURN;
  END IF;

  -- Trouver un admin actif pour le chat (proposeur ou premier admin)
  admin_id := m.proposed_by;

  -- Créer le chat groupé
  INSERT INTO public.chats (type, match_id, status, created_by)
  VALUES ('match_group', p_match_id, 'open', admin_id)
  RETURNING id INTO new_chat_id;

  -- Participants : user A, user B, admin
  INSERT INTO public.chat_participants (chat_id, user_id, role)
  VALUES
    (new_chat_id, m.user_a_id, 'user'),
    (new_chat_id, m.user_b_id, 'user'),
    (new_chat_id, admin_id, 'admin');

  -- Activer le match
  UPDATE public.matches
  SET
    status = 'active',
    chat_id = new_chat_id,
    activated_at = NOW(),
    updated_at = NOW()
  WHERE id = p_match_id;

  SELECT display_name INTO user_a_name FROM public.profiles WHERE id = m.user_a_id;
  SELECT display_name INTO user_b_name FROM public.profiles WHERE id = m.user_b_id;

  -- Message d'introduction admin
  INSERT INTO public.messages (chat_id, sender_id, content)
  VALUES (
    new_chat_id,
    admin_id,
    format(
      'Bonjour %s et %s, je suis heureux de vous mettre en contact. D''après vos profils et vos attentes, nous pensons que vous pourriez bien vous entendre. Prenez le temps d''échanger ici.',
      COALESCE(split_part(user_a_name, ' ', 1), 'vous'),
      COALESCE(split_part(user_b_name, ' ', 1), 'vous')
    )
  );

  -- Notifications
  PERFORM public.create_notification(
    m.user_a_id,
    'chat_opened',
    'Discussion ouverte',
    'Votre discussion a été créée. Vous pouvez maintenant échanger.',
    jsonb_build_object('match_id', p_match_id, 'chat_id', new_chat_id)
  );
  PERFORM public.create_notification(
    m.user_b_id,
    'chat_opened',
    'Discussion ouverte',
    'Votre discussion a été créée. Vous pouvez maintenant échanger.',
    jsonb_build_object('match_id', p_match_id, 'chat_id', new_chat_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_check_match_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('paid', 'free') AND NEW.type = 'matching' AND NEW.match_id IS NOT NULL THEN
    PERFORM public.check_match_payment_status(NEW.match_id);
  END IF;

  IF NEW.status IN ('paid', 'free') AND NEW.type = 'registration' THEN
    UPDATE public.profiles
    SET
      registration_payment_status = NEW.status,
      status = CASE WHEN status = 'pending' THEN 'active' ELSE status END,
      updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER payments_check_match
  AFTER INSERT OR UPDATE OF status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.trigger_check_match_on_payment();

-- ============================================================================
-- PROPOSER UN MATCH (admin)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.propose_match(
  p_admin_id UUID,
  p_user_a_id UUID,
  p_user_b_id UUID,
  p_amount DECIMAL DEFAULT 49.00,
  p_currency CHAR(3) DEFAULT 'EUR'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ordered_a UUID;
  ordered_b UUID;
  v_match_id UUID;
  admin_ok BOOLEAN;
BEGIN
  -- Vérifier admin
  SELECT public.is_admin() INTO admin_ok;
  IF NOT admin_ok AND auth.uid() != p_admin_id THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  -- Ordonner les UUIDs
  IF p_user_a_id < p_user_b_id THEN
    ordered_a := p_user_a_id;
    ordered_b := p_user_b_id;
  ELSE
    ordered_a := p_user_b_id;
    ordered_b := p_user_a_id;
  END IF;

  IF ordered_a = ordered_b THEN
    RAISE EXCEPTION 'Cannot match user with themselves';
  END IF;

  -- Créer le match
  INSERT INTO public.matches (user_a_id, user_b_id, status, proposed_by)
  VALUES (ordered_a, ordered_b, 'pending_payment', p_admin_id)
  RETURNING id INTO v_match_id;

  -- Créer paiements matching pour chaque utilisateur
  INSERT INTO public.payments (user_id, match_id, type, amount, currency, status)
  VALUES
    (ordered_a, v_match_id, 'matching', p_amount, p_currency, 'unpaid'),
    (ordered_b, v_match_id, 'matching', p_amount, p_currency, 'unpaid');

  -- Notifications
  PERFORM public.create_notification(
    ordered_a,
    'match_proposed',
    'Match proposé',
    'Un administrateur vous propose un match.',
    jsonb_build_object('match_id', v_match_id)
  );
  PERFORM public.create_notification(
    ordered_b,
    'match_proposed',
    'Match proposé',
    'Un administrateur vous propose un match.',
    jsonb_build_object('match_id', v_match_id)
  );
  PERFORM public.create_notification(
    ordered_a,
    'matching_payment_required',
    'Paiement requis',
    'Votre mise en relation est prête. Payez les frais de matching pour continuer.',
    jsonb_build_object('match_id', v_match_id)
  );
  PERFORM public.create_notification(
    ordered_b,
    'matching_payment_required',
    'Paiement requis',
    'Votre mise en relation est prête. Payez les frais de matching pour continuer.',
    jsonb_build_object('match_id', v_match_id)
  );

  PERFORM public.log_admin_action(
    p_admin_id,
    'propose_match',
    'match',
    v_match_id,
    jsonb_build_object('user_a', ordered_a, 'user_b', ordered_b)
  );

  RETURN v_match_id;
END;
$$;

-- ============================================================================
-- ACCORDER ACCÈS GRATUIT (admin)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.grant_free_access(
  p_admin_id UUID,
  p_user_id UUID,
  p_access_type public.free_access_type,
  p_match_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  INSERT INTO public.free_accesses (user_id, access_type, match_id, granted_by, reason, expires_at)
  VALUES (p_user_id, p_access_type, p_match_id, p_admin_id, p_reason, p_expires_at)
  RETURNING id INTO v_id;

  IF p_access_type IN ('registration', 'full') THEN
    UPDATE public.profiles
    SET registration_payment_status = 'free', status = 'active', updated_at = NOW()
    WHERE id = p_user_id;

    INSERT INTO public.payments (user_id, type, amount, currency, status, provider)
    VALUES (p_user_id, 'registration', 0, 'EUR', 'free', 'manual');
  END IF;

  IF p_access_type IN ('matching', 'full') AND p_match_id IS NOT NULL THEN
    UPDATE public.payments
    SET status = 'free', updated_at = NOW()
    WHERE user_id = p_user_id AND match_id = p_match_id AND type = 'matching';

    PERFORM public.check_match_payment_status(p_match_id);
  END IF;

  PERFORM public.log_admin_action(
    p_admin_id,
    'grant_free_access',
    'free_access',
    v_id,
    jsonb_build_object('user_id', p_user_id, 'access_type', p_access_type)
  );

  RETURN v_id;
END;
$$;

-- ============================================================================
-- CHANGER STATUT MATCH (admin)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_match_status(
  p_admin_id UUID,
  p_match_id UUID,
  p_status public.match_status,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m public.matches%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  SELECT * INTO m FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  UPDATE public.matches
  SET
    status = p_status,
    outcome_note = COALESCE(p_note, outcome_note),
    closed_at = CASE WHEN p_status IN ('success', 'failed', 'cancelled') THEN NOW() ELSE closed_at END,
    updated_at = NOW()
  WHERE id = p_match_id;

  IF p_status = 'success' THEN
    PERFORM public.create_notification(m.user_a_id, 'match_success', 'Match réussi', 'Félicitations. Votre mise en relation a été finalisée.', jsonb_build_object('match_id', p_match_id));
    PERFORM public.create_notification(m.user_b_id, 'match_success', 'Match réussi', 'Félicitations. Votre mise en relation a été finalisée.', jsonb_build_object('match_id', p_match_id));
  ELSIF p_status = 'failed' THEN
    PERFORM public.create_notification(m.user_a_id, 'match_failed', 'Match échoué', 'Ce match n''a pas abouti, mais nous continuons à chercher pour vous.', jsonb_build_object('match_id', p_match_id));
    PERFORM public.create_notification(m.user_b_id, 'match_failed', 'Match échoué', 'Ce match n''a pas abouti, mais nous continuons à chercher pour vous.', jsonb_build_object('match_id', p_match_id));
  END IF;

  IF p_status IN ('success', 'failed', 'cancelled') AND m.chat_id IS NOT NULL THEN
    UPDATE public.chats SET status = 'closed', closed_at = NOW() WHERE id = m.chat_id;
  END IF;

  PERFORM public.log_admin_action(p_admin_id, 'update_match_status', 'match', p_match_id, jsonb_build_object('status', p_status));
END;
$$;

-- ============================================================================
-- SOFT DELETE UTILISATEUR
-- ============================================================================

CREATE OR REPLACE FUNCTION public.soft_delete_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() != p_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.profiles
  SET
    is_deleted = TRUE,
    status = 'deleted',
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Matchs actifs → failed
  UPDATE public.matches
  SET status = 'failed', closed_at = NOW(), updated_at = NOW()
  WHERE status = 'active'
    AND (user_a_id = p_user_id OR user_b_id = p_user_id);

  PERFORM public.create_notification(
    p_user_id,
    'account_deleted',
    'Compte supprimé',
    'Votre compte a été supprimé.',
    '{}'
  );
END;
$$;

-- ============================================================================
-- LIKE — notification
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_like_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.create_notification(
    NEW.from_user_id,
    'like_sent',
    'Intérêt enregistré',
    'Votre intérêt a été enregistré.',
    jsonb_build_object('to_user_id', NEW.to_user_id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER likes_notify_sender
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.trigger_like_notification();

-- ============================================================================
-- CONTACT ADMIN — création chat
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_admin_contact_chat(
  p_name TEXT,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chat_id UUID;
  v_admin_id UUID;
BEGIN
  INSERT INTO public.chats (type, contact_name, contact_email, contact_phone, status, created_by)
  VALUES ('admin_contact', p_name, p_email, p_phone, 'open', p_user_id)
  RETURNING id INTO v_chat_id;

  IF p_user_id IS NOT NULL THEN
    INSERT INTO public.chat_participants (chat_id, user_id, role)
    VALUES (v_chat_id, p_user_id, 'user');
  END IF;

  -- Assigner le premier admin actif
  SELECT p.id INTO v_admin_id
  FROM public.profiles p
  JOIN public.admin_profiles ap ON ap.id = p.id
  WHERE p.role IN ('admin', 'superadmin')
    AND p.is_deleted = FALSE
    AND ap.is_active = TRUE
  ORDER BY p.created_at
  LIMIT 1;

  IF v_admin_id IS NOT NULL THEN
    INSERT INTO public.chat_participants (chat_id, user_id, role)
    VALUES (v_chat_id, v_admin_id, 'admin');
  END IF;

  IF p_message IS NOT NULL AND trim(p_message) != '' THEN
    INSERT INTO public.messages (chat_id, sender_id, content)
    VALUES (v_chat_id, p_user_id, p_message);
  END IF;

  RETURN v_chat_id;
END;
$$;
