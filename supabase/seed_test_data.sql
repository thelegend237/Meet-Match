-- ============================================================================
-- MEET & MATCH — Données de test (120+ profils)
-- ============================================================================
-- Exécuter dans Supabase SQL Editor APRÈS les migrations (001 → 004).
--
-- Comptes de test — mot de passe pour TOUS : Test1234!
--
-- Comptes nommés (scénarios documentés) :
-- | superadmin@meetandmatch.test | superadmin |
-- | admin@meetandmatch.test      | admin      |
-- | sophie@test.com … julien@test.com | 8 users |
--
-- Comptes bulk : user001@test.com … user120@test.com (120 profils)
-- Total : 2 admins + 128 utilisateurs = 130 comptes
-- ============================================================================

-- Nettoyage des données de test existantes
DELETE FROM public.messages WHERE chat_id IN (
  SELECT id FROM public.chats WHERE contact_email LIKE '%@test.com' OR created_by IN (
    SELECT id FROM auth.users WHERE email LIKE '%@meetandmatch.test' OR email LIKE '%@test.com'
  )
);
DELETE FROM public.chat_participants WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@meetandmatch.test' OR email LIKE '%@test.com'
);
DELETE FROM public.chats WHERE contact_email LIKE '%@test.com';
DELETE FROM public.payments WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@meetandmatch.test' OR email LIKE '%@test.com'
);
DELETE FROM public.matches WHERE user_a_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@meetandmatch.test' OR email LIKE '%@test.com'
) OR user_b_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@meetandmatch.test' OR email LIKE '%@test.com'
) OR proposed_by IN (
  SELECT id FROM auth.users WHERE email LIKE '%@meetandmatch.test' OR email LIKE '%@test.com'
);
DELETE FROM public.likes WHERE from_user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@meetandmatch.test' OR email LIKE '%@test.com'
) OR to_user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@meetandmatch.test' OR email LIKE '%@test.com'
);
DELETE FROM public.profile_photos WHERE profile_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@meetandmatch.test' OR email LIKE '%@test.com'
);
DELETE FROM public.notifications WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@meetandmatch.test' OR email LIKE '%@test.com'
);
-- admin_logs et free_accesses référencent admin_id / granted_by (ON DELETE RESTRICT)
DELETE FROM public.admin_logs WHERE admin_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@meetandmatch.test' OR email LIKE '%@test.com'
);
DELETE FROM public.free_accesses WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@meetandmatch.test' OR email LIKE '%@test.com'
) OR granted_by IN (
  SELECT id FROM auth.users WHERE email LIKE '%@meetandmatch.test' OR email LIKE '%@test.com'
);
DELETE FROM public.admin_profiles WHERE id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@meetandmatch.test' OR email LIKE '%@test.com'
);
DELETE FROM auth.identities WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@meetandmatch.test' OR email LIKE '%@test.com'
);
DELETE FROM auth.users WHERE email LIKE '%@meetandmatch.test' OR email LIKE '%@test.com';

-- ============================================================================
-- Helper : créer un utilisateur Auth + Identity
-- ============================================================================
CREATE OR REPLACE FUNCTION public.__seed_create_user(
  p_id UUID,
  p_email TEXT,
  p_password TEXT,
  p_display_name TEXT,
  p_country_code TEXT DEFAULT 'FR',
  p_city TEXT DEFAULT 'Paris'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    p_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'display_name', p_display_name,
      'country_code', p_country_code,
      'city', p_city
    ),
    NOW(),
    NOW(),
    '', '', '', ''
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    p_id,
    p_id::text,
    jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  RETURN p_id;
END;
$$;

-- ============================================================================
-- Helper : générer N profils bulk (user001@test.com …)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.__seed_bulk_users(p_count INT DEFAULT 120)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_i INT;
  v_id UUID;
  v_email TEXT;
  v_first TEXT;
  v_last TEXT;
  v_display TEXT;
  v_gender public.gender_type;
  v_city TEXT;
  v_country TEXT;
  v_dob DATE;
  v_age INT;
  v_rel public.relationship_type;
  v_scope public.relation_scope;
  v_pay public.payment_status;
  v_status public.profile_status;
  v_created TIMESTAMPTZ;

  v_first_male TEXT[] := ARRAY[
    'Antoine','Baptiste','Nicolas','Hugo','Maxime','Alexandre','Romain','Florian',
    'Guillaume','Olivier','Sébastien','Vincent','Matthieu','Benjamin','Cédric',
    'Damien','Étienne','Fabien','Grégory','Jérôme','Kevin','Laurent','Marc','Noah',
    'Pascal','Quentin','Rémi','Simon','Théo','Xavier','Yann','Adrien','Bruno',
    'Christophe','Denis','Emmanuel','François','Gabriel','Henri','Ivan','Jacques'
  ];
  v_first_female TEXT[] := ARRAY[
    'Camille','Léa','Chloé','Manon','Julie','Sarah','Laura','Pauline','Audrey',
    'Céline','Émilie','Florence','Hélène','Isabelle','Justine','Karine','Lucie',
    'Marine','Nathalie','Océane','Patricia','Quitterie','Rose','Sandra','Tiffany',
    'Valérie','Wendy','Yasmine','Zoé','Amélie','Béatrice','Charlotte','Diane',
    'Élodie','Fanny','Gaëlle','Inès','Jade','Kelly','Louna','Margot'
  ];
  v_last_names TEXT[] := ARRAY[
    'Martin','Bernard','Dubois','Thomas','Robert','Richard','Petit','Durand',
    'Leroy','Moreau','Simon','Laurent','Lefebvre','Michel','Garcia','David',
    'Bertrand','Roux','Vincent','Fournier','Girard','Bonnet','Dupont','Lambert',
    'Fontaine','Rousseau','Blanc','Guerin','Muller','Henry','Roussel','Nicolas',
    'Perrin','Morin','Mathieu','Clement','Gauthier','Chevalier','Colin','Aubert'
  ];
  v_cities TEXT[][] := ARRAY[
    ARRAY['Paris','FR'], ARRAY['Lyon','FR'], ARRAY['Marseille','FR'],
    ARRAY['Toulouse','FR'], ARRAY['Nice','FR'], ARRAY['Nantes','FR'],
    ARRAY['Strasbourg','FR'], ARRAY['Montpellier','FR'], ARRAY['Bordeaux','FR'],
    ARRAY['Lille','FR'], ARRAY['Rennes','FR'], ARRAY['Reims','FR'],
    ARRAY['Bruxelles','BE'], ARRAY['Liège','BE'], ARRAY['Genève','CH'],
    ARRAY['Lausanne','CH'], ARRAY['Montréal','CA'], ARRAY['Québec','CA'],
    ARRAY['Douala','CM'], ARRAY['Abidjan','CI']
  ];
  v_bios TEXT[] := ARRAY[
    'Passionné(e) par les voyages et les rencontres authentiques.',
    'À la recherche d''une relation sincère et durable.',
    'Sportif(ve), curieux(se) et ouvert(e) sur le monde.',
    'Amoureux(se) de la nature, de la culture et des bons moments.',
    'Professionnel(le) épanoui(e), prêt(e) à partager ma vie.',
    'Calme, attentionné(e) et avec un vrai projet de couple.',
    'J''aime découvrir de nouvelles personnes et de nouveaux horizons.',
    'Recherche une connexion profonde basée sur le respect mutuel.'
  ];
BEGIN
  FOR v_i IN 1..p_count LOOP
    v_id := ('22222222-2222-2222-2222-' || lpad((300 + v_i)::text, 12, '0'))::uuid;
    v_email := 'user' || lpad(v_i::text, 3, '0') || '@test.com';

    IF v_i % 2 = 0 THEN
      v_gender := 'female';
      v_first := v_first_female[1 + (v_i % array_length(v_first_female, 1))];
    ELSE
      v_gender := 'male';
      v_first := v_first_male[1 + (v_i % array_length(v_first_male, 1))];
    END IF;

    v_last := v_last_names[1 + (v_i % array_length(v_last_names, 1))];
    v_display := v_first || ' ' || v_last;
    v_city := v_cities[1 + (v_i % array_length(v_cities, 1))][1];
    v_country := v_cities[1 + (v_i % array_length(v_cities, 1))][2];
    v_age := 24 + (v_i % 22);
    v_dob := (CURRENT_DATE - (v_age * 365 + (v_i % 200)))::date;
    v_rel := (ARRAY['serious','marriage','friendship','serious']::public.relationship_type[])[1 + (v_i % 4)];
    v_scope := (ARRAY['local','national','international']::public.relation_scope[])[1 + (v_i % 3)];

    -- ~85% payé actif, ~8% gratuit actif, ~7% impayé inactif
    IF v_i % 14 = 0 THEN
      v_pay := 'unpaid';
      v_status := 'inactive';
    ELSIF v_i % 12 = 0 THEN
      v_pay := 'free';
      v_status := 'active';
    ELSE
      v_pay := 'paid';
      v_status := 'active';
    END IF;

    -- Quelques profils récents pour tester "Suggestions du jour"
    IF v_i <= 15 THEN
      v_created := NOW() - ((v_i % 10) || ' days')::interval;
    ELSE
      v_created := NOW() - ((30 + (v_i % 300)) || ' days')::interval;
    END IF;

    PERFORM public.__seed_create_user(v_id, v_email, 'Test1234!', v_display, v_country, v_city);

    UPDATE public.profiles SET
      display_name = v_display,
      date_of_birth = v_dob,
      gender = v_gender,
      country_code = v_country,
      city = v_city,
      language = CASE WHEN v_country IN ('CA','BE','CH') THEN 'fr' ELSE 'fr' END,
      bio = v_bios[1 + (v_i % array_length(v_bios, 1))],
      expectations = 'Une personne sincère, respectueuse et prête à s''investir.',
      relationship_type = v_rel,
      preferred_age_min = GREATEST(22, v_age - 8),
      preferred_age_max = LEAST(55, v_age + 10),
      preferred_country_code = v_country,
      preferred_city = CASE WHEN v_i % 5 = 0 THEN v_city ELSE NULL END,
      preferred_relation_scope = v_scope,
      status = v_status,
      registration_payment_status = v_pay,
      primary_photo_url = 'https://i.pravatar.cc/500?u=mm-bulk-' || v_i,
      created_at = v_created,
      updated_at = v_created
    WHERE id = v_id;

    IF v_pay = 'paid' THEN
      INSERT INTO public.payments (user_id, type, amount, currency, status, provider)
      VALUES (v_id, 'registration', 29.00, 'EUR', 'paid', 'manual');
    ELSIF v_pay = 'free' THEN
      INSERT INTO public.payments (user_id, type, amount, currency, status, provider)
      VALUES (v_id, 'registration', 0.00, 'EUR', 'free', 'manual');
      INSERT INTO public.free_accesses (user_id, access_type, granted_by, reason)
      VALUES (v_id, 'registration', '11111111-1111-1111-1111-111111111102', 'Seed bulk gratuit');
    END IF;
  END LOOP;

  RETURN p_count;
END;
$$;

-- ============================================================================
-- Admins
-- ============================================================================
SELECT public.__seed_create_user(
  '11111111-1111-1111-1111-111111111101',
  'superadmin@meetandmatch.test',
  'Test1234!',
  'Super Admin'
);
SELECT public.__seed_create_user(
  '11111111-1111-1111-1111-111111111102',
  'admin@meetandmatch.test',
  'Test1234!',
  'Admin Meet & Match'
);

-- ============================================================================
-- 8 utilisateurs nommés (scénarios de test)
-- ============================================================================
SELECT public.__seed_create_user('22222222-2222-2222-2222-222222222201', 'sophie@test.com',  'Test1234!', 'Sophie Martin',  'FR', 'Paris');
SELECT public.__seed_create_user('22222222-2222-2222-2222-222222222202', 'thomas@test.com',  'Test1234!', 'Thomas Dubois',  'FR', 'Lyon');
SELECT public.__seed_create_user('22222222-2222-2222-2222-222222222203', 'marie@test.com',   'Test1234!', 'Marie Lefebvre', 'BE', 'Bruxelles');
SELECT public.__seed_create_user('22222222-2222-2222-2222-222222222204', 'lucas@test.com',   'Test1234!', 'Lucas Bernard',  'FR', 'Marseille');
SELECT public.__seed_create_user('22222222-2222-2222-2222-222222222205', 'emma@test.com',    'Test1234!', 'Emma Rousseau',  'CA', 'Montréal');
SELECT public.__seed_create_user('22222222-2222-2222-2222-222222222206', 'pierre@test.com',  'Test1234!', 'Pierre Moreau',  'FR', 'Paris');
SELECT public.__seed_create_user('22222222-2222-2222-2222-222222222207', 'claire@test.com',  'Test1234!', 'Claire Petit',   'FR', 'Bordeaux');
SELECT public.__seed_create_user('22222222-2222-2222-2222-222222222208', 'julien@test.com',  'Test1234!', 'Julien Garcin',  'CH', 'Genève');

-- ============================================================================
-- 120 profils bulk
-- ============================================================================
SELECT public.__seed_bulk_users(120);

-- ============================================================================
-- Profils admins
-- ============================================================================
UPDATE public.profiles SET
  display_name = 'Super Admin',
  role = 'superadmin',
  status = 'active',
  registration_payment_status = 'free',
  profile_completion = 100,
  gender = 'prefer_not_say',
  country_code = 'FR',
  city = 'Paris',
  language = 'fr',
  bio = 'Compte super administrateur de démonstration.',
  primary_photo_url = 'https://i.pravatar.cc/500?u=superadmin'
WHERE id = '11111111-1111-1111-1111-111111111101';

UPDATE public.profiles SET
  display_name = 'Admin Meet & Match',
  role = 'admin',
  status = 'active',
  registration_payment_status = 'free',
  profile_completion = 100,
  gender = 'prefer_not_say',
  country_code = 'FR',
  city = 'Paris',
  language = 'fr',
  bio = 'Administrateur Meet & Match — accompagnement des mises en relation.',
  primary_photo_url = 'https://i.pravatar.cc/500?u=admin'
WHERE id = '11111111-1111-1111-1111-111111111102';

INSERT INTO public.admin_profiles (id, title, is_active) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Super Administrateur', TRUE),
  ('11111111-1111-1111-1111-111111111102', 'Administrateur', TRUE)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, is_active = TRUE;

-- ============================================================================
-- Profils nommés détaillés
-- ============================================================================
UPDATE public.profiles SET
  date_of_birth = '1992-03-15', gender = 'female', country_code = 'FR', city = 'Paris',
  language = 'fr', bio = 'Passionnée de voyages et de cuisine. Je recherche une relation sérieuse et sincère.',
  expectations = 'Une personne honnête, stable et prête à construire quelque chose de durable.',
  relationship_type = 'serious', preferred_age_min = 30, preferred_age_max = 45,
  preferred_relation_scope = 'national', status = 'active', registration_payment_status = 'paid',
  primary_photo_url = 'https://i.pravatar.cc/500?u=sophie202'
WHERE id = '22222222-2222-2222-2222-222222222201';

UPDATE public.profiles SET
  date_of_birth = '1988-07-22', gender = 'male', country_code = 'FR', city = 'Lyon',
  language = 'fr', bio = 'Ingénieur, sportif le week-end. J''aime les discussions profondes et les sorties nature.',
  expectations = 'Rencontre sérieuse avec une personne compatible sur les valeurs.',
  relationship_type = 'serious', preferred_age_min = 28, preferred_age_max = 40,
  preferred_relation_scope = 'national', status = 'active', registration_payment_status = 'paid',
  primary_photo_url = 'https://i.pravatar.cc/500?u=thomas202'
WHERE id = '22222222-2222-2222-2222-222222222202';

UPDATE public.profiles SET
  date_of_birth = '1990-11-08', gender = 'female', country_code = 'BE', city = 'Bruxelles',
  language = 'fr', bio = 'Consultante, bilingue FR/EN. Culture, art et bon restaurants.',
  expectations = 'Relation engagée avec quelqu''un d''ouvert et respectueux.',
  relationship_type = 'marriage', preferred_age_min = 32, preferred_age_max = 48,
  preferred_relation_scope = 'international', status = 'active', registration_payment_status = 'paid',
  primary_photo_url = 'https://i.pravatar.cc/500?u=marie202'
WHERE id = '22222222-2222-2222-2222-222222222203';

UPDATE public.profiles SET
  date_of_birth = '1995-01-30', gender = 'male', country_code = 'FR', city = 'Marseille',
  language = 'fr', bio = 'Professeur, passionné de musique et de mer. Calme et attentif.',
  expectations = 'Construire une relation basée sur la confiance et le respect mutuel.',
  relationship_type = 'serious', preferred_age_min = 25, preferred_age_max = 38,
  preferred_relation_scope = 'local', status = 'active', registration_payment_status = 'free',
  primary_photo_url = 'https://i.pravatar.cc/500?u=lucas202'
WHERE id = '22222222-2222-2222-2222-222222222204';

UPDATE public.profiles SET
  date_of_birth = '1993-06-12', gender = 'female', country_code = 'CA', city = 'Montréal',
  language = 'fr', bio = 'Designer graphique. Créative, curieuse, j''adore découvrir de nouvelles cultures.',
  expectations = 'Quelqu''un de sincère avec un projet de vie clair.',
  relationship_type = 'serious', preferred_age_min = 28, preferred_age_max = 42,
  preferred_relation_scope = 'international', status = 'active', registration_payment_status = 'paid',
  primary_photo_url = 'https://i.pravatar.cc/500?u=emma202'
WHERE id = '22222222-2222-2222-2222-222222222205';

UPDATE public.profiles SET
  date_of_birth = '1987-09-25', gender = 'male', country_code = 'FR', city = 'Paris',
  language = 'fr', bio = 'Profil incomplet — inscription non finalisée.',
  expectations = 'À compléter.',
  relationship_type = 'serious', status = 'inactive', registration_payment_status = 'unpaid',
  primary_photo_url = 'https://i.pravatar.cc/500?u=pierre202'
WHERE id = '22222222-2222-2222-2222-222222222206';

UPDATE public.profiles SET
  date_of_birth = '1994-04-18', gender = 'female', country_code = 'FR', city = 'Bordeaux',
  language = 'fr', bio = 'Viticultrice en conversion bio. Amoureuse de la nature et des belles choses.',
  expectations = 'Partenaire de vie partageant des valeurs écologiques et familiales.',
  relationship_type = 'marriage', preferred_age_min = 30, preferred_age_max = 44,
  preferred_relation_scope = 'national', status = 'active', registration_payment_status = 'paid',
  primary_photo_url = 'https://i.pravatar.cc/500?u=claire202'
WHERE id = '22222222-2222-2222-2222-222222222207';

UPDATE public.profiles SET
  date_of_birth = '1991-12-03', gender = 'male', country_code = 'CH', city = 'Genève',
  language = 'fr', bio = 'Banquier privé. Sport, ski et gastronomie. Recherche une relation stable.',
  expectations = 'Personne sérieuse, indépendante et prête à s''investir.',
  relationship_type = 'serious', preferred_age_min = 27, preferred_age_max = 40,
  preferred_relation_scope = 'international', status = 'active', registration_payment_status = 'paid',
  primary_photo_url = 'https://i.pravatar.cc/500?u=julien202'
WHERE id = '22222222-2222-2222-2222-222222222208';

-- Recalcul complétion
UPDATE public.profiles p
SET profile_completion = public.calculate_profile_completion(p.id)
WHERE p.id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@test.com' OR email LIKE '%@meetandmatch.test'
);

-- ============================================================================
-- Photos profil
-- ============================================================================
INSERT INTO public.profile_photos (profile_id, storage_path, url, is_primary, sort_order)
SELECT id, 'seed/' || id::text || '/primary.jpg', primary_photo_url, TRUE, 0
FROM public.profiles
WHERE primary_photo_url IS NOT NULL
  AND id IN (
    SELECT id FROM auth.users WHERE email LIKE '%@test.com' OR email LIKE '%@meetandmatch.test'
  )
ON CONFLICT DO NOTHING;

-- Photos secondaires pour ~30% des profils bulk
INSERT INTO public.profile_photos (profile_id, storage_path, url, is_primary, sort_order)
SELECT
  p.id,
  'seed/' || p.id::text || '/secondary.jpg',
  replace(p.primary_photo_url, '?u=', '?u=sec-'),
  FALSE,
  1
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email ~ '^user\d{3}@test\.com$'
  AND (substring(u.email from '\d+')::int % 3 = 0)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Paiements inscription (comptes nommés)
-- ============================================================================
INSERT INTO public.payments (user_id, type, amount, currency, status, provider) VALUES
  ('22222222-2222-2222-2222-222222222201', 'registration', 29.00, 'EUR', 'paid', 'manual'),
  ('22222222-2222-2222-2222-222222222202', 'registration', 29.00, 'EUR', 'paid', 'manual'),
  ('22222222-2222-2222-2222-222222222203', 'registration', 29.00, 'EUR', 'paid', 'manual'),
  ('22222222-2222-2222-2222-222222222204', 'registration',  0.00, 'EUR', 'free', 'manual'),
  ('22222222-2222-2222-2222-222222222205', 'registration', 42.00, 'CAD', 'paid', 'manual'),
  ('22222222-2222-2222-2222-222222222207', 'registration', 29.00, 'EUR', 'paid', 'manual'),
  ('22222222-2222-2222-2222-222222222208', 'registration', 29.00, 'EUR', 'paid', 'manual');

INSERT INTO public.free_accesses (user_id, access_type, granted_by, reason) VALUES
  ('22222222-2222-2222-2222-222222222204', 'registration', '11111111-1111-1111-1111-111111111102', 'Accès test gratuit')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Likes nommés + bulk
-- ============================================================================
INSERT INTO public.likes (from_user_id, to_user_id) VALUES
  ('22222222-2222-2222-2222-222222222201', '22222222-2222-2222-2222-222222222202'),
  ('22222222-2222-2222-2222-222222222202', '22222222-2222-2222-2222-222222222201'),
  ('22222222-2222-2222-2222-222222222203', '22222222-2222-2222-2222-222222222204'),
  ('22222222-2222-2222-2222-222222222204', '22222222-2222-2222-2222-222222222203'),
  ('22222222-2222-2222-2222-222222222205', '22222222-2222-2222-2222-222222222208'),
  ('22222222-2222-2222-2222-222222222208', '22222222-2222-2222-2222-222222222205'),
  ('22222222-2222-2222-2222-222222222201', '22222222-2222-2222-2222-222222222208'),
  ('22222222-2222-2222-2222-222222222207', '22222222-2222-2222-2222-222222222202'),
  ('22222222-2222-2222-2222-222222222207', '22222222-2222-2222-2222-222222222201')
ON CONFLICT DO NOTHING;

-- Likes réciproques bulk (20 paires : user001↔002, user003↔004, …)
INSERT INTO public.likes (from_user_id, to_user_id)
SELECT
  ('22222222-2222-2222-2222-' || lpad((300 + v_i)::text, 12, '0'))::uuid,
  ('22222222-2222-2222-2222-' || lpad((300 + v_i + 1)::text, 12, '0'))::uuid
FROM generate_series(1, 39, 2) AS v_i
ON CONFLICT DO NOTHING;

INSERT INTO public.likes (from_user_id, to_user_id)
SELECT
  ('22222222-2222-2222-2222-' || lpad((300 + v_i + 1)::text, 12, '0'))::uuid,
  ('22222222-2222-2222-2222-' || lpad((300 + v_i)::text, 12, '0'))::uuid
FROM generate_series(1, 39, 2) AS v_i
ON CONFLICT DO NOTHING;

-- Likes unidirectionnels bulk (~150)
INSERT INTO public.likes (from_user_id, to_user_id)
SELECT DISTINCT
  a.id,
  b.id
FROM public.profiles a
JOIN auth.users ua ON ua.id = a.id
JOIN public.profiles b ON b.id <> a.id
JOIN auth.users ub ON ub.id = b.id
WHERE ua.email ~ '^user\d{3}@test\.com$'
  AND ub.email ~ '^user\d{3}@test\.com$'
  AND a.status = 'active'
  AND b.status = 'active'
  AND (substring(ua.email from '\d+')::int + substring(ub.email from '\d+')::int) % 7 = 0
  AND a.id < b.id
LIMIT 150
ON CONFLICT DO NOTHING;

-- Likes croisés bulk → comptes nommés
INSERT INTO public.likes (from_user_id, to_user_id)
SELECT
  ('22222222-2222-2222-2222-' || lpad((300 + v_i)::text, 12, '0'))::uuid,
  '22222222-2222-2222-2222-222222222201'::uuid
FROM generate_series(1, 30) AS v_i
WHERE v_i % 3 <> 0
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Match en attente (Sophie ↔ Thomas)
-- ============================================================================
INSERT INTO public.matches (id, user_a_id, user_b_id, status, proposed_by) VALUES
  (
    '33333333-3333-3333-3333-333333333301',
    '22222222-2222-2222-2222-222222222201',
    '22222222-2222-2222-2222-222222222202',
    'pending_payment',
    '11111111-1111-1111-1111-111111111102'
  )
ON CONFLICT DO NOTHING;

INSERT INTO public.payments (user_id, match_id, type, amount, currency, status, provider) VALUES
  ('22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333301', 'matching', 49.00, 'EUR', 'unpaid', 'manual'),
  ('22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333301', 'matching', 49.00, 'EUR', 'unpaid', 'manual')
ON CONFLICT DO NOTHING;

INSERT INTO public.notifications (user_id, type, title, content, metadata) VALUES
  ('22222222-2222-2222-2222-222222222201', 'match_proposed', 'Match proposé', 'Un administrateur vous propose un match.', '{"match_id":"33333333-3333-3333-3333-333333333301"}'),
  ('22222222-2222-2222-2222-222222222202', 'match_proposed', 'Match proposé', 'Un administrateur vous propose un match.', '{"match_id":"33333333-3333-3333-3333-333333333301"}'),
  ('22222222-2222-2222-2222-222222222201', 'matching_payment_required', 'Paiement requis', 'Votre mise en relation est prête. Payez les frais de matching pour continuer.', '{}'),
  ('22222222-2222-2222-2222-222222222202', 'matching_payment_required', 'Paiement requis', 'Votre mise en relation est prête. Payez les frais de matching pour continuer.', '{}')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Statuts discovery : vérifié, en ligne, préférence genre
-- ============================================================================
UPDATE public.profiles SET
  is_verified = TRUE,
  last_seen_at = NOW() - INTERVAL '2 minutes'
WHERE email IN (
  'sophie@test.com', 'thomas@test.com', 'marie@test.com',
  'emma@test.com', 'claire@test.com', 'julien@test.com', 'lucas@test.com'
);

UPDATE public.profiles SET preferred_gender = 'male'
WHERE email = 'sophie@test.com';

UPDATE public.profiles SET preferred_gender = 'female'
WHERE email = 'thomas@test.com';

UPDATE public.profiles SET
  is_verified = TRUE
WHERE email ~ '^user\d{3}@test\.com$'
  AND (substring(email from '\d+')::int % 3 = 0)
  AND status = 'active';

UPDATE public.profiles SET
  last_seen_at = NOW() - INTERVAL '2 minutes'
WHERE email ~ '^user\d{3}@test\.com$'
  AND (substring(email from '\d+')::int % 5 = 0)
  AND status = 'active';

UPDATE public.profiles SET
  last_seen_at = NOW() - INTERVAL '45 minutes'
WHERE email ~ '^user\d{3}@test\.com$'
  AND (substring(email from '\d+')::int % 5 = 1)
  AND status = 'active';

-- ============================================================================
-- Contact admin (visiteur)
-- ============================================================================
SELECT public.create_admin_contact_chat(
  'Jean Visiteur',
  'visiteur@test.com',
  NULL,
  'Bonjour, je souhaite en savoir plus sur Meet & Match avant de m''inscrire.',
  NULL
);

-- ============================================================================
-- Nettoyage helpers
-- ============================================================================
DROP FUNCTION IF EXISTS public.__seed_bulk_users(INT);
DROP FUNCTION IF EXISTS public.__seed_create_user(UUID, TEXT, TEXT, TEXT, TEXT, TEXT);

-- ============================================================================
-- Vérification
-- ============================================================================
SELECT
  COUNT(*) FILTER (WHERE role = 'user') AS total_users,
  COUNT(*) FILTER (WHERE role IN ('admin','superadmin')) AS total_admins,
  COUNT(*) FILTER (WHERE status = 'active' AND registration_payment_status IN ('paid','free')) AS discovery_ready,
  COUNT(*) FILTER (WHERE registration_payment_status = 'unpaid') AS unpaid
FROM public.profiles
WHERE email LIKE '%@test.com' OR email LIKE '%@meetandmatch.test';

SELECT
  p.display_name,
  p.email,
  p.role,
  p.status,
  p.registration_payment_status,
  p.profile_completion,
  p.city,
  p.country_code
FROM public.profiles p
WHERE p.email LIKE '%@test.com' OR p.email LIKE '%@meetandmatch.test'
ORDER BY p.role DESC, p.email
LIMIT 20;
