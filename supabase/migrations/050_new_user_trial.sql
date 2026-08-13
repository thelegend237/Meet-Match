-- ============================================================================
-- MEET & MATCH — Migration 050 : Essai gratuit 14 jours (nouveaux inscrits)
-- ============================================================================
-- Chaque nouveau compte obtient :
--   - registration_payment_status = 'free'
--   - status = 'active'
--   - trial_ends_at = NOW() + 14 jours
-- Pendant l'essai : likes + matching gratuits.
-- Après expiration (cron expire_user_trials) : repasse en unpaid si pas payé.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.trial_ends_at IS
  'Fin de la période d''essai gratuite (14 jours). NULL = pas d''essai / déjà converti.';

CREATE INDEX IF NOT EXISTS idx_profiles_trial_ends_at
  ON public.profiles (trial_ends_at)
  WHERE trial_ends_at IS NOT NULL;

-- Helper : utilisateur encore en période d'essai
CREATE OR REPLACE FUNCTION public.user_is_on_trial(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_user_id
      AND p.trial_ends_at IS NOT NULL
      AND p.trial_ends_at > NOW()
      AND p.registration_payment_status = 'free'
      AND COALESCE(p.is_deleted, FALSE) = FALSE
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_is_on_trial(UUID) TO authenticated, service_role;

-- Matching gratuit pendant l'essai
CREATE OR REPLACE FUNCTION public.create_matching_payment_for_user(
  p_user_id UUID,
  p_match_id UUID,
  p_amount DECIMAL,
  p_currency CHAR(3)
)
RETURNS public.payment_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_status public.payment_status;
  v_amount DECIMAL := GREATEST(COALESCE(p_amount, 0), 0);
  v_month DATE := public.matching_billing_month();
BEGIN
  -- Essai actif, offre lancement / phase test / montant nul → gratuit
  IF public.user_is_on_trial(p_user_id) OR COALESCE(p_amount, 0) <= 0 THEN
    v_status := 'free';
    v_amount := 0;
  ELSIF NOT public.user_has_ever_paid_matching(p_user_id) THEN
    v_status := 'unpaid';
  ELSIF public.matching_free_credits_remaining(p_user_id) > 0 THEN
    INSERT INTO public.matching_credit_usage (user_id, match_id, billing_month)
    VALUES (p_user_id, p_match_id, v_month);
    v_status := 'free';
  ELSE
    v_status := 'unpaid';
  END IF;

  INSERT INTO public.payments (user_id, match_id, type, amount, currency, status, provider)
  VALUES (
    p_user_id,
    p_match_id,
    'matching',
    v_amount,
    p_currency,
    v_status,
    CASE WHEN v_status = 'free' THEN 'manual'::public.payment_provider ELSE 'stripe'::public.payment_provider END
  );

  RETURN v_status;
END;
$$;

-- Inscription : démarre l'essai 14 jours
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone TEXT;
  v_country TEXT;
  v_city TEXT;
  v_trial_end TIMESTAMPTZ := NOW() + INTERVAL '14 days';
BEGIN
  v_phone := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');
  v_country := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'country_code', '')), '');
  v_city := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'city', '')), '');

  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    phone,
    country_code,
    city,
    status,
    registration_payment_status,
    trial_ends_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    trim(COALESCE(NEW.raw_user_meta_data->>'display_name', '')),
    v_phone,
    v_country,
    v_city,
    'active',
    'free',
    v_trial_end
  );

  INSERT INTO public.payments (user_id, type, amount, currency, status, provider)
  VALUES (NEW.id, 'registration', 0, 'USD', 'free', 'manual');

  INSERT INTO public.free_accesses (user_id, access_type, granted_by, reason, expires_at)
  VALUES (
    NEW.id,
    'registration',
    NEW.id,
    'Essai gratuit 14 jours',
    v_trial_end
  );

  PERFORM public.create_notification(
    NEW.id,
    'account_created',
    'Bienvenue — 14 jours offerts',
    'Votre essai gratuit de 14 jours a commencé. Likez et acceptez des mises en relation sans payer jusqu''à la fin de la période.',
    jsonb_build_object('trial_ends_at', v_trial_end)
  );

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Un compte existe déjà avec cet email ou ce numéro de téléphone.';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erreur création profil: %', SQLERRM;
END;
$$;

-- Expire les essais terminés (appelé par cron service_role)
CREATE OR REPLACE FUNCTION public.expire_user_trials()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  r RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR r IN
    SELECT p.id
    FROM public.profiles p
    WHERE p.trial_ends_at IS NOT NULL
      AND p.trial_ends_at <= NOW()
      AND p.registration_payment_status = 'free'
      AND COALESCE(p.is_deleted, FALSE) = FALSE
      AND p.role = 'user'
      AND NOT EXISTS (
        SELECT 1
        FROM public.payments pay
        WHERE pay.user_id = p.id
          AND pay.type = 'registration'
          AND pay.status = 'paid'
      )
  LOOP
    UPDATE public.profiles
    SET
      registration_payment_status = 'unpaid',
      updated_at = NOW()
    WHERE id = r.id;

    UPDATE public.free_accesses
    SET expires_at = LEAST(COALESCE(expires_at, NOW()), NOW())
    WHERE user_id = r.id
      AND access_type IN ('registration', 'full')
      AND (expires_at IS NULL OR expires_at > NOW());

    PERFORM public.create_notification(
      r.id,
      'registration_payment_required',
      'Fin de votre essai gratuit',
      'Vos 14 jours offerts sont terminés. Activez votre compte pour continuer à liker et être mis en relation.',
      jsonb_build_object('reason', 'trial_expired')
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_user_trials() TO service_role;
