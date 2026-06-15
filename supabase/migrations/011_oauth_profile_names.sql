-- MEET & MATCH — Migration 011 : Noms profil pour inscription OAuth (Google, Facebook)

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
  v_display_name TEXT;
BEGIN
  v_phone := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');
  v_country := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'country_code', '')), '');
  v_city := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'city', '')), '');

  v_display_name := trim(COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'Membre'
  ));

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
    v_display_name,
    v_phone,
    v_country,
    v_city
  );

  PERFORM public.create_notification(
    NEW.id,
    'account_created',
    'Bienvenue sur Meet & Match',
    'Votre compte a été créé. Complétez votre profil pour commencer.',
    '{}'
  );

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Un compte existe déjà avec cet email ou ce numéro de téléphone.';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erreur création profil: %', SQLERRM;
END;
$$;
