# Meet & Match — Base de données Supabase

## Structure des migrations

| Fichier | Contenu |
|---------|---------|
| `001_initial_schema.sql` | Enums, tables, index, vues |
| `002_functions_triggers.sql` | Fonctions métier, triggers, auth hook |
| `003_rls_policies.sql` | RLS, storage bucket, Realtime |
| `004_grants.sql` | Grants RPC & vues |
| `005_profile_discovery.sql` | Genre recherché, compte vérifié, statut en ligne |
| `006_matching_payment_user.sql` | Paiement matching côté utilisateur |
| `007_registration_payment_user.sql` | Paiement inscription côté utilisateur |
| `008_fix_signup_profile_trigger.sql` | **Correctif** inscription (erreur 500 à la création de compte) |
| `009_profile_geolocation.sql` | **PostGIS** : cache géocode, coordonnées profil, RPC `discover_profiles` |
| `010_profile_passes.sql` | **Pass découverte** : table `profile_passes`, exclusion des profils passés |
| `011_oauth_profile_names.sql` | Noms profil pour inscription **Google / Facebook** |
| `seed.sql` | Paramètres tarifaires initiaux |
| `seed_test_data.sql` | **130 comptes de test** (128 users + 2 admins) — voir `TEST_DATA.md` |

## Installation

### Option A — Supabase CLI (recommandé)

```bash
# Installer Supabase CLI : https://supabase.com/docs/guides/cli
supabase init
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
psql -f supabase/seed.sql  # ou via SQL Editor
```

### Option B — SQL Editor (Dashboard Supabase)

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Ouvrir **SQL Editor**
3. Exécuter dans l'ordre :
   - `001_initial_schema.sql`
   - `002_functions_triggers.sql`
   - `003_rls_policies.sql`
   - `004_grants.sql`
   - `005_profile_discovery.sql`
   - `006_matching_payment_user.sql`
   - `007_registration_payment_user.sql`
   - `008_fix_signup_profile_trigger.sql`
   - `009_profile_geolocation.sql`
   - `010_profile_passes.sql`
   - `011_oauth_profile_names.sql`
   - `seed.sql`
   - `seed_test_data.sql` (optionnel — données de démo)

## Créer le superadmin

1. **Authentication → Users → Add user** (email + mot de passe)
2. Copier l'UUID du user
3. Exécuter :

```sql
UPDATE public.profiles
SET role = 'superadmin', status = 'active', registration_payment_status = 'free'
WHERE id = 'VOTRE-UUID-ICI';

INSERT INTO public.admin_profiles (id, title, is_active)
VALUES ('VOTRE-UUID-ICI', 'Super Administrateur', TRUE)
ON CONFLICT (id) DO NOTHING;
```

## Fonctions RPC exposées (app Next.js)

| Fonction | Usage |
|----------|-------|
| `propose_match(admin_id, user_a, user_b, amount, currency)` | Admin propose un match |
| `grant_free_access(admin_id, user_id, type, match_id, reason)` | Accès gratuit |
| `update_match_status(admin_id, match_id, status, note)` | Clôturer un match |
| `confirm_matching_payment(payment_id)` | User paie un match (MVP pré-Stripe) |
| `confirm_registration_payment()` | User paie l'inscription (MVP pré-Stripe) |
| `get_cached_geocode(city, country)` | Lecture cache géocode partagé |
| `set_profile_coordinates(lat, lng)` | Enregistre coordonnées profil + cache |
| `discover_profiles(excluded_ids, limit)` | Découverte triée PostGIS (KNN) |
| `soft_delete_user(user_id)` | Suppression compte |
| `create_admin_contact_chat(name, email, phone, message, user_id)` | Contact admin |

## Règles de sécurité enforceées

- Un utilisateur **ne peut pas** créer de chat `match_group`
- Un utilisateur **ne peut pas** envoyer un message hors de ses chats participants
- Un utilisateur **ne peut pas** liker deux fois le même profil
- Un utilisateur **ne peut pas** modifier son rôle ou `is_deleted`
- Les matchs actifs ouvrent automatiquement le chat après double paiement/free

## Connexion Google / Facebook (OAuth)

Dans le **Dashboard Supabase** :

1. **Authentication → URL Configuration**
   - Site URL : `http://localhost:3000` (dev) ou votre domaine prod
   - Redirect URLs : `http://localhost:3000/auth/callback` et `https://votre-domaine.com/auth/callback`

2. **Authentication → Providers**
   - **Google** : activer, renseigner Client ID / Secret ( [Google Cloud Console](https://console.cloud.google.com/) )
   - **Facebook** : activer, renseigner App ID / Secret ( [Meta for Developers](https://developers.facebook.com/) )

3. Exécuter la migration **`011_oauth_profile_names.sql`** (nom affiché depuis Google/Facebook)

L’app utilise `signInWithOAuth` puis `/auth/callback`. Les nouveaux comptes sont redirigés vers l’onboarding profil.

## Variables d'environnement (Next.js)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # webhooks Stripe uniquement, jamais côté client
```

## Schéma visuel

```
auth.users ──1:1── profiles ──1:N── profile_photos
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
        likes      payments   notifications
          │           │
          └───── matches ───── chats ─── messages
                              │
                      chat_participants
```
