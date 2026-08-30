-- ============================================================================
-- MEET & MATCH — Migration 057 : Messages de chat plus humains (emojis, ton chaleureux)
-- ============================================================================

-- Ouverture discussion match : bienvenue + intro personnalisée
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
  first_a TEXT;
  first_b TEXT;
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

  admin_id := m.proposed_by;

  INSERT INTO public.chats (type, match_id, status, created_by)
  VALUES ('match_group', p_match_id, 'open', admin_id)
  RETURNING id INTO new_chat_id;

  INSERT INTO public.chat_participants (chat_id, user_id, role)
  VALUES
    (new_chat_id, m.user_a_id, 'user'),
    (new_chat_id, m.user_b_id, 'user'),
    (new_chat_id, admin_id, 'admin');

  UPDATE public.matches
  SET
    status = 'active',
    chat_id = new_chat_id,
    activated_at = NOW(),
    updated_at = NOW()
  WHERE id = p_match_id;

  SELECT display_name INTO user_a_name FROM public.profiles WHERE id = m.user_a_id;
  SELECT display_name INTO user_b_name FROM public.profiles WHERE id = m.user_b_id;

  first_a := COALESCE(split_part(user_a_name, ' ', 1), 'vous');
  first_b := COALESCE(split_part(user_b_name, ' ', 1), 'vous');

  INSERT INTO public.messages (chat_id, sender_id, content)
  VALUES
    (
      new_chat_id,
      admin_id,
      E'Bienvenue sur Meet & Match 💜\n\nNous espérons que vous trouviez votre moitié ici. Une photo de profil nous aidera à mieux vous accompagner — n''hésitez pas à en ajouter une si ce n''est pas déjà fait.\n\nBonne journée 😊'
    ),
    (
      new_chat_id,
      admin_id,
      format(
        E'Bonjour %s et %s 👋✨\n\nJe suis ravie de vous mettre en contact ! D''après vos profils et vos attentes, nous pensons que vous pourriez vraiment bien vous entendre.\n\nPrenez le temps d''échanger ici — nous sommes là si vous avez besoin de nous 💬',
        first_a,
        first_b
      )
    );

  PERFORM public.create_notification(
    m.user_a_id,
    'chat_opened',
    'Discussion ouverte 💬',
    'Votre conversation est prête — vous pouvez échanger avec votre match et notre équipe.',
    jsonb_build_object('match_id', p_match_id, 'chat_id', new_chat_id)
  );
  PERFORM public.create_notification(
    m.user_b_id,
    'chat_opened',
    'Discussion ouverte 💬',
    'Votre conversation est prête — vous pouvez échanger avec votre match et notre équipe.',
    jsonb_build_object('match_id', p_match_id, 'chat_id', new_chat_id)
  );
END;
$$;

-- Clôture match : message dans le chat + notifications chaleureuses
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

    UPDATE public.profiles
    SET
      status = 'inactive',
      deactivated_at = NOW(),
      deactivation_reason = 'match_success',
      updated_at = NOW()
    WHERE id IN (m.user_a_id, m.user_b_id)
      AND is_deleted = FALSE;

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
      'Cette rencontre n''a pas abouti, mais la prochaine pourrait être la bonne ! 🍀 Nous continuons à chercher pour vous.',
      jsonb_build_object('match_id', p_match_id)
    );
    PERFORM public.create_notification(
      m.user_b_id, 'match_failed', 'Match terminé',
      'Cette rencontre n''a pas abouti, mais la prochaine pourrait être la bonne ! 🍀 Nous continuons à chercher pour vous.',
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

-- Notifications propose_match et paiement matching
CREATE OR REPLACE FUNCTION public.notify_matching_payment_status(
  p_user_id UUID,
  p_match_id UUID,
  p_status public.payment_status,
  p_liable BOOLEAN DEFAULT TRUE,
  p_amount DECIMAL DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT COALESCE(p_liable, TRUE) THEN
    PERFORM public.create_notification(
      p_user_id,
      'matching_payment_required',
      'Match proposé ✨',
      'Un administrateur vous propose un match. Les frais de matching sont à la charge de la personne qui a manifesté son intérêt en premier.',
      jsonb_build_object('match_id', p_match_id, 'waived_reason', 'one_way_recipient')
    );
    RETURN;
  END IF;

  IF p_status = 'unpaid' THEN
    PERFORM public.create_notification(
      p_user_id,
      'matching_payment_required',
      'Paiement matching 💳',
      'Votre mise en relation est prête. Finalisez les frais de matching pour ouvrir la discussion.',
      jsonb_build_object('match_id', p_match_id)
    );
  ELSIF COALESCE(p_amount, 0) <= 0 THEN
    PERFORM public.create_notification(
      p_user_id,
      'matching_payment_required',
      'Match offert 🎁',
      'Cette mise en relation est gratuite (essai ou offre en cours). Confirmez pour ouvrir la discussion !',
      jsonb_build_object('match_id', p_match_id, 'covered_by_promo', true)
    );
  END IF;
END;
$$;

-- propose_match : notifications membres plus engageantes (corps de fonction inchangé)
CREATE OR REPLACE FUNCTION public.propose_match(
  p_admin_id UUID,
  p_user_a_id UUID,
  p_user_b_id UUID,
  p_amount_a DECIMAL DEFAULT 10.00,
  p_currency_a CHAR(3) DEFAULT 'USD',
  p_amount_b DECIMAL DEFAULT 10.00,
  p_currency_b CHAR(3) DEFAULT 'USD',
  p_liable_a BOOLEAN DEFAULT TRUE,
  p_liable_b BOOLEAN DEFAULT TRUE,
  p_source TEXT DEFAULT 'manual'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  ordered_a UUID;
  ordered_b UUID;
  v_match_id UUID;
  admin_ok BOOLEAN;
  v_name_a TEXT;
  v_name_b TEXT;
  v_role_a public.user_role;
  v_role_b public.user_role;
  v_status_a public.payment_status;
  v_status_b public.payment_status;
  v_amount_a DECIMAL;
  v_amount_b DECIMAL;
  v_currency_a CHAR(3);
  v_currency_b CHAR(3);
  v_liable_a BOOLEAN;
  v_liable_b BOOLEAN;
BEGIN
  SELECT public.is_admin() INTO admin_ok;
  IF NOT admin_ok AND auth.uid() != p_admin_id THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  IF p_user_a_id < p_user_b_id THEN
    ordered_a := p_user_a_id;
    ordered_b := p_user_b_id;
    v_amount_a := p_amount_a;
    v_amount_b := p_amount_b;
    v_currency_a := p_currency_a;
    v_currency_b := p_currency_b;
    v_liable_a := COALESCE(p_liable_a, TRUE);
    v_liable_b := COALESCE(p_liable_b, TRUE);
  ELSE
    ordered_a := p_user_b_id;
    ordered_b := p_user_a_id;
    v_amount_a := p_amount_b;
    v_amount_b := p_amount_a;
    v_currency_a := p_currency_b;
    v_currency_b := p_currency_a;
    v_liable_a := COALESCE(p_liable_b, TRUE);
    v_liable_b := COALESCE(p_liable_a, TRUE);
  END IF;

  SELECT role INTO v_role_a FROM public.profiles WHERE id = ordered_a;
  SELECT role INTO v_role_b FROM public.profiles WHERE id = ordered_b;
  IF v_role_a IS DISTINCT FROM 'user'::public.user_role
     OR v_role_b IS DISTINCT FROM 'user'::public.user_role THEN
    RAISE EXCEPTION 'Cannot match staff accounts with members';
  END IF;

  IF public.user_has_blocking_match(ordered_a) THEN
    RAISE EXCEPTION 'Le membre % a déjà une mise en relation en cours.', ordered_a;
  END IF;

  IF public.user_has_blocking_match(ordered_b) THEN
    RAISE EXCEPTION 'Le membre % a déjà une mise en relation en cours.', ordered_b;
  END IF;

  INSERT INTO public.matches (user_a_id, user_b_id, status, proposed_by)
  VALUES (ordered_a, ordered_b, 'pending_payment', p_admin_id)
  RETURNING id INTO v_match_id;

  v_status_a := public.create_matching_payment_for_user(
    ordered_a, v_match_id, v_amount_a, v_currency_a, v_liable_a
  );
  v_status_b := public.create_matching_payment_for_user(
    ordered_b, v_match_id, v_amount_b, v_currency_b, v_liable_b
  );

  PERFORM public.create_notification(
    ordered_a, 'match_proposed', 'Un match pour vous ! 💫',
    'Notre équipe vous propose une mise en relation. Consultez votre espace Match pour la suite.',
    jsonb_build_object('match_id', v_match_id, 'source', p_source)
  );
  PERFORM public.create_notification(
    ordered_b, 'match_proposed', 'Un match pour vous ! 💫',
    'Notre équipe vous propose une mise en relation. Consultez votre espace Match pour la suite.',
    jsonb_build_object('match_id', v_match_id, 'source', p_source)
  );

  PERFORM public.notify_matching_payment_status(
    ordered_a, v_match_id, v_status_a, v_liable_a, v_amount_a
  );
  PERFORM public.notify_matching_payment_status(
    ordered_b, v_match_id, v_status_b, v_liable_b, v_amount_b
  );

  SELECT display_name INTO v_name_a FROM public.profiles WHERE id = ordered_a;
  SELECT display_name INTO v_name_b FROM public.profiles WHERE id = ordered_b;

  PERFORM public.notify_active_admins(
    'admin_match_pending',
    'Match proposé — paiements en attente',
    COALESCE(v_name_a, 'Membre') || ' et ' || COALESCE(v_name_b, 'Membre')
      || ' (' || COALESCE(p_source, 'manual') || ') — statuts : '
      || CASE
           WHEN NOT v_liable_a THEN 'exempté (A)'
           WHEN v_status_a = 'free' THEN 'gratuit (A)'
           ELSE 'à payer (A)'
         END
      || ' / '
      || CASE
           WHEN NOT v_liable_b THEN 'exempté (B)'
           WHEN v_status_b = 'free' THEN 'gratuit (B)'
           ELSE 'à payer (B)'
         END,
    jsonb_build_object(
      'match_id', v_match_id,
      'source', p_source,
      'payment_status_a', v_status_a,
      'payment_status_b', v_status_b,
      'liable_a', v_liable_a,
      'liable_b', v_liable_b
    )
  );

  PERFORM public.log_admin_action(
    p_admin_id, 'propose_match', 'match', v_match_id,
    jsonb_build_object(
      'user_a', ordered_a,
      'user_b', ordered_b,
      'source', p_source,
      'payment_status_a', v_status_a,
      'payment_status_b', v_status_b,
      'liable_a', v_liable_a,
      'liable_b', v_liable_b
    )
  );

  PERFORM public.check_match_payment_status(v_match_id);

  RETURN v_match_id;
END;
$$;
