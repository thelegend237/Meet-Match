# Migrations Supabase — Meet & Match

Appliquer **dans l'ordre** via le SQL Editor Supabase (ou `supabase db push`).

## Ordre obligatoire

| # | Fichier | Contenu |
|---|---------|---------|
| 000 | `000_schema_bridge.sql` | **Optionnel** — pont si base existante (Control-Flow) sans 001 |
| 001 | `001_initial_schema.sql` | Enums, `profiles` (city, country_code, …), tables cœur |
| 002 | `002_functions_triggers.sql` | `is_active_user()`, triggers, notifications |
| 003 | `003_rls_policies.sql` | Row Level Security |
| 004 | `004_grants.sql` | Grants RPC |
| 005 | `005_profile_discovery.sql` | `preferred_gender`, `is_verified`, `last_seen_at` |
| 006 | `006_matching_payment_user.sql` | Paiement matching MVP |
| 007 | `007_registration_payment_user.sql` | Paiement inscription MVP |
| 008 | `008_fix_signup_profile_trigger.sql` | Fix inscription + complétion profil |
| 009 | `009_profile_geolocation.sql` | PostGIS, `geocode_cache`, coords profil, `discover_profiles` |
| 010 | `010_profile_passes.sql` | Pass / masquer profils |
| 011 | `011_oauth_profile_names.sql` | Noms OAuth (Google, Facebook) |
| 012 | `012_messages_mark_read.sql` | Marquer messages lus |
| 013 | `013_geo_cities.sql` | Référentiel villes + autocomplete inscription |
| 014 | `014_message_reactions.sql` | Réactions emoji sur les messages |
| 015 | `015_pricing_cad_default.sql` | Tarifs par défaut en **CAD** (42 / 72) |
| 016 | `016_fix_admin_contact_chat.sql` | Contact admin : réutilisation chat, admin sans `admin_profiles`, notification |
| 017 | `017_notification_system.sql` | Notifications unifiées : types admin, like reçu, paiement confirmé, `notify_active_admins()` |
| 018 | `018_admin_role_management.sql` | Gestion des rôles depuis l'admin (`update_user_role`) |
| 019 | `019_admin_delete_user.sql` | Suppression de profil par superadmin (`admin_delete_user`) |
| 020 | `020_staff_profile_access.sql` | Profil membre pour admin/superadmin : accès sans paiement, exclusion du fil découverte |
| 021 | `021_profile_languages.sql` | Langues parlées multiples (`profiles.languages`) |
| 022 | `022_profile_photo_size_limit.sql` | Limite upload photos profil → **25 Mo** (bucket Storage) |

## Dépendances clés

```
001 profiles.city, country_code, gender_type, payment_status
  └─ 002 is_active_user()
  └─ 005 is_verified, last_seen_at
       └─ 009 geocode_cache, latitude/longitude, discover_profiles()
            └─ 013 geo_cities, search_geo_cities()
```

## Après la migration 013

Import complet GeoNames (villes > 5 000 hab.) :

```bash
npm run seed:geo
```

Variables `.env.local` : `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## Projet Supabase dédié

**Ne pas** réutiliser un projet avec un autre schéma (ex. Control-Flow) : les enums et colonnes diffèrent et provoquent des erreurs en chaîne.

Pour Meet & Match : **nouveau projet Supabase** → appliquer 001 → 022 dans l'ordre.

**Base existante (Control-Flow)** : exécuter `000_schema_bridge.sql` puis `009` → `013`, ou mieux : nouveau projet dédié.

**Tables cœur (messages, chats, likes, matchs)** : créées uniquement par **001**. Sans 001, les migrations 003, 011 (create_notification) et 012 échouent.

La migration **009** inclut aussi un pont intégré (enums + colonnes) si 001/002 n'ont pas été appliquées.

## Vérifier que 001 est bien appliquée

Exécuter **`diagnostic_schema.sql`** dans le SQL Editor : listes des colonnes, enums et fonctions manquants.

```sql
-- Colonnes profiles (extrait)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;
```

Colonnes attendues dès 001 : `city`, `country_code`, `gender`, `registration_payment_status`, …

> **Note :** la migration **009** ajoute automatiquement `city`, `country_code`, `is_verified` et `last_seen_at` si elles manquent (pont 001/005). Les **enums** (`gender_type`, etc.) doivent toutefois exister — appliquer **001** en priorité si le diagnostic les signale manquants.
