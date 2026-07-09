-- ============================================================================

-- MEET & MATCH — Migration 043 : Activation inscription alignée phase test (0 $)

-- ============================================================================

-- En phase test, l'activation enregistre un paiement à 0 $ avec statut « free »,

-- cohérent avec PRICING_TEST_MODE côté app.



CREATE OR REPLACE FUNCTION public.confirm_registration_payment()

RETURNS UUID

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = public

AS $$

DECLARE

  pay public.payments%ROWTYPE;

  v_amount NUMERIC(10, 2) := 0.00;

  v_currency TEXT := 'CAD';

  v_final_status public.payment_status := 'free';

  v_profile public.profiles%ROWTYPE;

BEGIN

  SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid();

  IF NOT FOUND THEN

    RAISE EXCEPTION 'Profile not found';

  END IF;



  IF v_profile.registration_payment_status IN ('paid', 'free') THEN

    RAISE EXCEPTION 'Registration already paid';

  END IF;



  IF v_profile.country_code = 'US' THEN

    v_currency := 'USD';

  END IF;



  SELECT * INTO pay

  FROM public.payments

  WHERE user_id = auth.uid()

    AND type = 'registration'

    AND status IN ('unpaid', 'failed')

  ORDER BY created_at DESC

  LIMIT 1;



  IF NOT FOUND THEN

    INSERT INTO public.payments (user_id, type, amount, currency, status, provider)

    VALUES (auth.uid(), 'registration', v_amount, v_currency, 'unpaid', 'manual')

    RETURNING * INTO pay;

  END IF;



  UPDATE public.payments

  SET

    amount = v_amount,

    currency = v_currency,

    status = v_final_status,

    provider = 'manual',

    updated_at = NOW()

  WHERE id = pay.id;



  RETURN pay.id;

END;

$$;



GRANT EXECUTE ON FUNCTION public.confirm_registration_payment() TO authenticated;


