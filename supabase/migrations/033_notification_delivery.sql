-- ============================================================================
-- MEET & MATCH — Migration 033 : Livraison notifications (email, push, messages)
-- ============================================================================

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'message_received';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_email BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notify_push BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON public.push_subscriptions (user_id);

CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  last_error TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_outbox_notification
  ON public.notification_outbox (notification_id);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending
  ON public.notification_outbox (created_at)
  WHERE delivered_at IS NULL;

-- File d'attente à chaque notification in-app
CREATE OR REPLACE FUNCTION public.trigger_notification_outbox()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_outbox (notification_id)
  VALUES (NEW.id)
  ON CONFLICT (notification_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_enqueue_delivery ON public.notifications;
CREATE TRIGGER notifications_enqueue_delivery
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notification_outbox();

-- Notification in-app + file pour chaque nouveau message
CREATE OR REPLACE FUNCTION public.trigger_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name TEXT;
  v_preview TEXT;
  r RECORD;
BEGIN
  SELECT display_name INTO v_sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  v_preview := left(NEW.content, 120);
  IF length(NEW.content) > 120 THEN
    v_preview := v_preview || '…';
  END IF;

  FOR r IN
    SELECT cp.user_id
    FROM public.chat_participants cp
    WHERE cp.chat_id = NEW.chat_id
      AND cp.user_id != NEW.sender_id
      AND cp.hidden_at IS NULL
  LOOP
    PERFORM public.create_notification(
      r.user_id,
      'message_received',
      COALESCE(v_sender_name, 'Nouveau message'),
      v_preview,
      jsonb_build_object(
        'chat_id', NEW.chat_id,
        'message_id', NEW.id,
        'sender_id', NEW.sender_id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_notify_recipients ON public.messages;
CREATE TRIGGER messages_notify_recipients
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_message_notification();

-- Realtime pour toasts in-app
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- RLS push_subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_select_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_select_own
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS push_subscriptions_insert_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_insert_own
  ON public.push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS push_subscriptions_delete_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_delete_own
  ON public.push_subscriptions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS push_subscriptions_update_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_update_own
  ON public.push_subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
