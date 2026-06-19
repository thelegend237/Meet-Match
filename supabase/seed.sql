-- ============================================================================
-- MEET & MATCH — Seed : paramètres initiaux
-- ============================================================================
-- Note : le superadmin doit être créé manuellement via Supabase Auth,
-- puis exécuter le bloc ci-dessous en remplaçant l'UUID.

-- Paramètres tarifaires par défaut
INSERT INTO public.app_settings (key, value) VALUES
  ('registration_fee_eur', '{"amount": 29.00, "currency": "EUR", "label": "Frais d''inscription"}'),
  ('registration_fee_usd', '{"amount": 32.00, "currency": "USD", "label": "Registration fee"}'),
  ('registration_fee_cad', '{"amount": 42.00, "currency": "CAD", "label": "Frais d''inscription"}'),
  ('matching_fee_eur', '{"amount": 49.00, "currency": "EUR", "label": "Frais de matching"}'),
  ('matching_fee_usd', '{"amount": 55.00, "currency": "USD", "label": "Matching fee"}'),
  ('matching_fee_cad', '{"amount": 72.00, "currency": "CAD", "label": "Frais de matching"}'),
  ('platform_name', '"Meet & Match"'),
  ('platform_tagline', '"Rencontrez des personnes sérieuses grâce à une mise en relation humaine."'),
  ('contact_email', '"contact@meetandmatch.com"'),
  ('supported_currencies', '["CAD", "USD", "EUR"]'),
  ('supported_countries', '{"EU": ["FR", "BE", "CH", "LU"], "NA": ["CA", "US"], "AF": ["CM", "CI", "SN"]}')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PROMOTION SUPERADMIN (à exécuter après création du compte Auth)
-- ============================================================================
-- Remplacer 'YOUR-SUPERADMIN-UUID' par l'UUID du user Supabase Auth :
--
-- UPDATE public.profiles
-- SET role = 'superadmin', status = 'active', registration_payment_status = 'free'
-- WHERE id = 'YOUR-SUPERADMIN-UUID';
--
-- INSERT INTO public.admin_profiles (id, title, is_active)
-- VALUES ('YOUR-SUPERADMIN-UUID', 'Super Administrateur', TRUE)
-- ON CONFLICT (id) DO NOTHING;
