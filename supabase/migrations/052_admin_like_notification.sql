-- ============================================================================
-- MEET & MATCH — Migration 052 : Alerte admin à chaque like (pas seulement réciproque)
-- ============================================================================

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'admin_like_received';

CREATE OR REPLACE FUNCTION public.trigger_like_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_name TEXT;
  v_to_name TEXT;
  v_is_mutual BOOLEAN;
BEGIN
  SELECT display_name INTO v_from_name
  FROM public.profiles WHERE id = NEW.from_user_id;

  SELECT display_name INTO v_to_name
  FROM public.profiles WHERE id = NEW.to_user_id;

  PERFORM public.create_notification(
    NEW.to_user_id,
    'like_received',
    'Nouveau like',
    COALESCE(v_from_name, 'Un membre') || ' s''intéresse à votre profil.',
    jsonb_build_object('from_user_id', NEW.from_user_id)
  );

  SELECT EXISTS (
    SELECT 1
    FROM public.likes l
    WHERE l.from_user_id = NEW.to_user_id
      AND l.to_user_id = NEW.from_user_id
  ) INTO v_is_mutual;

  IF v_is_mutual THEN
    PERFORM public.notify_active_admins(
      'admin_mutual_like',
      'Like réciproque',
      COALESCE(v_from_name, 'Membre') || ' et ' || COALESCE(v_to_name, 'Membre')
        || ' se sont likés — une mise en relation est possible.',
      jsonb_build_object(
        'user_a_id', LEAST(NEW.from_user_id, NEW.to_user_id),
        'user_b_id', GREATEST(NEW.from_user_id, NEW.to_user_id)
      )
    );
  ELSE
    PERFORM public.notify_active_admins(
      'admin_like_received',
      'Nouveau like',
      COALESCE(v_from_name, 'Un membre') || ' s''intéresse à '
        || COALESCE(v_to_name, 'un membre') || ' — vous pouvez proposer une mise en relation.',
      jsonb_build_object(
        'from_user_id', NEW.from_user_id,
        'to_user_id', NEW.to_user_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;
