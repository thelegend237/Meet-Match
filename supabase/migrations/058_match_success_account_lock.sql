-- ============================================================================
-- MEET & MATCH — Migration 058 : Verrouillage compte après match réussi
-- ============================================================================
-- Corrige les membres restés actifs malgré un match success (055 non appliquée
-- ou clôture avant migration). Bloque toute nouvelle proposition tant que
-- l'admin n'a pas réactivé le compte.

CREATE OR REPLACE FUNCTION public.user_is_locked_after_match_success(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_user_id
      AND p.is_deleted = FALSE
      AND p.role = 'user'
      AND p.status = 'inactive'
      AND p.deactivation_reason = 'match_success'
  )
  OR EXISTS (
    SELECT 1
    FROM public.matches m
    WHERE m.deleted_at IS NULL
      AND m.status = 'success'
      AND (m.user_a_id = p_user_id OR m.user_b_id = p_user_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_is_locked_after_match_success(UUID) TO authenticated;

-- Fidélité : inclut aussi les comptes verrouillés après succès
CREATE OR REPLACE FUNCTION public.user_has_blocking_match(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_is_locked_after_match_success(p_user_id)
  OR EXISTS (
    SELECT 1
    FROM public.matches m
    WHERE m.deleted_at IS NULL
      AND m.status IN ('pending_payment', 'active')
      AND (m.user_a_id = p_user_id OR m.user_b_id = p_user_id)
  );
$$;

-- Désactive les deux membres d'un match réussi
CREATE OR REPLACE FUNCTION public.deactivate_members_for_match_success(p_match_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m public.matches%ROWTYPE;
BEGIN
  SELECT * INTO m
  FROM public.matches
  WHERE id = p_match_id
    AND deleted_at IS NULL;

  IF NOT FOUND OR m.status IS DISTINCT FROM 'success' THEN
    RETURN;
  END IF;

  UPDATE public.profiles
  SET
    status = 'inactive',
    deactivated_at = COALESCE(deactivated_at, NOW()),
    deactivation_reason = 'match_success',
    updated_at = NOW()
  WHERE id IN (m.user_a_id, m.user_b_id)
    AND is_deleted = FALSE
    AND role = 'user';
END;
$$;

-- Trigger : toute mise à jour en success désactive immédiatement les deux comptes
CREATE OR REPLACE FUNCTION public.trg_match_success_deactivate_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'success' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.deactivate_members_for_match_success(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_match_success_deactivate ON public.matches;
CREATE TRIGGER trg_match_success_deactivate
  AFTER UPDATE OF status ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_match_success_deactivate_members();

-- Rattrapage : membres encore actifs avec au moins un match réussi
UPDATE public.profiles p
SET
  status = 'inactive',
  deactivated_at = COALESCE(p.deactivated_at, NOW()),
  deactivation_reason = 'match_success',
  updated_at = NOW()
WHERE p.role = 'user'
  AND p.is_deleted = FALSE
  AND (p.status != 'inactive' OR p.deactivation_reason IS DISTINCT FROM 'match_success')
  AND EXISTS (
    SELECT 1
    FROM public.matches m
    WHERE m.deleted_at IS NULL
      AND m.status = 'success'
      AND (m.user_a_id = p.id OR m.user_b_id = p.id)
  );

-- Clôture admin : désactivation garantie + messages chat (057)
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
  admin_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  SELECT * INTO m
  FROM public.matches
  WHERE id = p_match_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  admin_id := COALESCE(m.proposed_by, p_admin_id);

  UPDATE public.matches
  SET
    status = p_status,
    outcome_note = COALESCE(p_note, outcome_note),
    closed_at = CASE
      WHEN p_status IN ('success', 'failed', 'cancelled') THEN NOW()
      ELSE closed_at
    END,
    updated_at = NOW()
  WHERE id = p_match_id;

  IF p_status = 'success' THEN
    PERFORM public.deactivate_members_for_match_success(p_match_id);

    PERFORM public.create_notification(
      m.user_a_id, 'match_success', 'Match réussi ! 🥳',
      'Félicitations — votre mise en relation a abouti. Votre compte est en pause pendant que vous vivez cette belle histoire.',
      jsonb_build_object('match_id', p_match_id)
    );
    PERFORM public.create_notification(
      m.user_b_id, 'match_success', 'Match réussi ! 🥳',
      'Félicitations — votre mise en relation a abouti. Votre compte est en pause pendant que vous vivez cette belle histoire.',
      jsonb_build_object('match_id', p_match_id)
    );

    IF m.chat_id IS NOT NULL THEN
      INSERT INTO public.messages (chat_id, sender_id, content)
      VALUES
        (
          m.chat_id,
          admin_id,
          E'Félicitations ! 🥳❤️\n\nVotre échange était un beau premier pas vers une possible connexion. Nous sommes heureux d''avoir pu vous rapprocher et espérons que cette rencontre continuera sur une belle lancée. ✨\n\nPuisque vous avez décidé d''échanger vos coordonnées, votre conversation sur Meet & Match sera maintenant fermée. À vous de faire vivre la suite ! ❤️'
        ),
        (
          m.chat_id,
          admin_id,
          E'Merci d''avoir tenté l''aventure avec nous ! 🌸💕'
        );
    END IF;
  ELSIF p_status = 'failed' THEN
    PERFORM public.create_notification(
      m.user_a_id, 'match_failed', 'Match terminé',
      'Cette rencontre n''a pas abouti, mais la prochaine pourrait être la bonne ! 🍀',
      jsonb_build_object('match_id', p_match_id)
    );
    PERFORM public.create_notification(
      m.user_b_id, 'match_failed', 'Match terminé',
      'Cette rencontre n''a pas abouti, mais la prochaine pourrait être la bonne ! 🍀',
      jsonb_build_object('match_id', p_match_id)
    );

    IF m.chat_id IS NOT NULL THEN
      INSERT INTO public.messages (chat_id, sender_id, content)
      VALUES (
        m.chat_id,
        admin_id,
        E'Même si cette rencontre n''a pas abouti à une connexion, chaque échange est une nouvelle expérience et une occasion de faire une belle rencontre. ❤️\n\nVotre match est maintenant terminé. Qui sait ? La prochaine rencontre sera peut-être la bonne ! 🍀🤝'
      );
    END IF;
  ELSIF p_status = 'cancelled' AND m.chat_id IS NOT NULL THEN
    INSERT INTO public.messages (chat_id, sender_id, content)
    VALUES (
      m.chat_id,
      admin_id,
      E'Cette mise en relation est clôturée. Merci d''avoir tenté l''aventure avec Meet & Match ! 🌸💕\n\nNous restons à vos côtés pour la suite — n''hésitez pas à nous écrire si besoin.'
    );
  END IF;

  IF p_status IN ('success', 'failed', 'cancelled') AND m.chat_id IS NOT NULL THEN
    UPDATE public.chats
    SET status = 'closed', closed_at = COALESCE(closed_at, NOW())
    WHERE id = m.chat_id;
  END IF;

  PERFORM public.log_admin_action(
    p_admin_id,
    'update_match_status',
    'match',
    p_match_id,
    jsonb_build_object('status', p_status)
  );
END;
$$;

-- Demande réactivation : autoriser aussi si match success en base (profil pas encore sync)
CREATE OR REPLACE FUNCTION public.request_account_reactivation(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_name TEXT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND OR v_profile.is_deleted THEN
    RAISE EXCEPTION 'Profil introuvable';
  END IF;

  IF NOT public.user_is_locked_after_match_success(p_user_id) THEN
    RAISE EXCEPTION 'Réactivation non disponible pour ce compte';
  END IF;

  -- Aligner le profil si encore actif par erreur
  UPDATE public.profiles
  SET
    status = 'inactive',
    deactivated_at = COALESCE(deactivated_at, NOW()),
    deactivation_reason = 'match_success',
    updated_at = NOW()
  WHERE id = p_user_id
    AND role = 'user'
    AND is_deleted = FALSE
    AND (status != 'inactive' OR deactivation_reason IS DISTINCT FROM 'match_success');

  v_name := COALESCE(v_profile.display_name, v_profile.email, 'Membre');

  PERFORM public.create_notification(
    p_user_id,
    'reactivation_requested',
    'Demande enregistrée',
    'Votre demande de réactivation a été transmise à l''équipe. Vous serez contacté·e prochainement.',
    jsonb_build_object('user_id', p_user_id)
  );

  PERFORM public.notify_active_admins(
    'admin_reactivation_requested',
    'Demande de réactivation',
    v_name || ' souhaite réactiver son compte après une mise en relation réussie.',
    jsonb_build_object('user_id', p_user_id)
  );
END;
$$;
