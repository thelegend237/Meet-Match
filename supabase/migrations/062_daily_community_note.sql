-- Envoie un seul message du jour aux membres encore inscrits.
-- Idempotent : un membre ne le reçoit qu'une fois pour une date donnée.

CREATE OR REPLACE FUNCTION public.send_daily_community_note(
  p_title TEXT,
  p_content TEXT,
  p_day TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, content, metadata)
  SELECT
    p.id,
    'community_note',
    p_title,
    p_content,
    jsonb_build_object('day', p_day)
  FROM public.profiles p
  WHERE p.role = 'user'
    AND p.is_deleted = FALSE
    AND p.status IN ('active', 'pending')
    AND NOT EXISTS (
      SELECT 1
      FROM public.notifications n
      WHERE n.user_id = p.id
        AND n.type = 'community_note'
        AND n.metadata->>'day' = p_day
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.send_daily_community_note(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_daily_community_note(TEXT, TEXT, TEXT) TO service_role;
