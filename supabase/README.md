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
| … | Voir **[MIGRATIONS.md](./MIGRATIONS.md)** pour la liste complète (`012` → `018`) |
| `seed.sql` | Paramètres tarifaires initiaux |
| `seed_test_data.sql` | **130 comptes de test** (128 users + 2 admins) — voir `TEST_DATA.md` |

> **Ordre d’installation :** appliquer toutes les migrations **`001` → `018`** dans l’ordre — détail dans [MIGRATIONS.md](./MIGRATIONS.md).

> **Passer en production (base vide, vrais utilisateurs) :** voir **[PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md)** et `scripts/reset_production_data.sql`.

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
3. Exécuter **toutes** les migrations dans l’ordre — voir [MIGRATIONS.md](./MIGRATIONS.md) (`001` → `018`)
4. Exécuter `seed.sql`
5. Optionnel : `seed_test_data.sql` (données de démo — voir `TEST_DATA.md`)

## Rôles : membre, admin, superadmin

| Rôle (`profiles.role`) | Accès application |
|------------------------|-------------------|
| `user` | Espace membre (`/decouvrir`, profil, likes, matchs…) |
| `admin` | Espace admin (`/admin`) — gestion utilisateurs, matchs, conversations |
| `superadmin` | Idem admin + gestion des rôles (y compris superadmin) et paramètres réservés |

À l’**inscription**, tout compte est créé avec `role = 'user'` (trigger sur `auth.users`).  
Les admins ont en plus une ligne dans **`admin_profiles`** (`title`, `is_active`).

### Différence admin / superadmin

- **Admin** et **superadmin** accèdent tous les deux à `/admin` et peuvent gérer membres, matchs, paiements, messages.
- **Superadmin uniquement** :
  - Attribuer ou retirer le rôle **superadmin**
  - Modifier un autre superadmin
  - Gérer `admin_profiles` et `app_settings` (politiques RLS)

---

## Créer le premier superadmin (une seule fois, via Supabase)

Avant qu’un superadmin existe, l’app ne peut pas encore attribuer de rôles. Il faut donc **bootstrap** le premier compte dans Supabase :

1. **Authentication → Users → Add user** (email + mot de passe)
2. Exécuter dans le **SQL Editor** (par email ou UUID) :

```sql
UPDATE public.profiles
SET role = 'superadmin', status = 'active', registration_payment_status = 'free'
WHERE email = 'votre@email.com';

INSERT INTO public.admin_profiles (id, title, is_active)
SELECT id, 'Super Administrateur', TRUE
FROM public.profiles
WHERE email = 'votre@email.com'
ON CONFLICT (id) DO UPDATE SET is_active = TRUE, title = EXCLUDED.title;
```

3. Se connecter sur l’app → redirection vers **`/admin`**

---

## Créer un admin ou un superadmin (via l’interface)

**Prérequis :** migration **`018_admin_role_management.sql`** appliquée.

1. Se connecter avec un compte **admin** ou **superadmin**
2. Aller dans **Admin → Utilisateurs**
3. Ouvrir la fiche du membre à promouvoir
4. Section **« Rôle et accès »** → choisir **Administrateur** ou **Super administrateur**
5. Cliquer **Enregistrer le rôle**

La fonction RPC `update_user_role` met à jour `profiles.role`, synchronise `admin_profiles` et journalise l’action dans `admin_logs`.

### Qui peut attribuer quoi ?

| Acteur | Peut attribuer |
|--------|----------------|
| **Admin** | Membre, Administrateur |
| **Superadmin** | Membre, Administrateur, Super administrateur |

Règles : impossible de modifier **son propre** rôle ; impossible de rétrograder le **dernier** superadmin ; seul un superadmin peut modifier un autre superadmin.

### Comptes de test (après `seed_test_data.sql`)

| Email | Rôle | Mot de passe |
|-------|------|--------------|
| `superadmin@meetandmatch.test` | superadmin | `Test1234!` |
| `admin@meetandmatch.test` | admin | `Test1234!` |

Voir [TEST_DATA.md](./TEST_DATA.md) pour le détail des scénarios de démo.

## Fonctions RPC exposées (app Next.js)

| Fonction | Usage |
|----------|-------|
| `propose_match(admin_id, user_a, user_b, amount, currency)` | Admin propose un match |
| `grant_free_access(admin_id, user_id, type, match_id, reason)` | Accès gratuit |
| `update_user_role(admin_id, user_id, role)` | Changer le rôle (`user` / `admin` / `superadmin`) |
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

## Notifications email & push (migration 033)

Après application de **`033_notification_delivery.sql`**, configurez l’envoi hors application :

### Variables Vercel / `.env.local`

| Variable | Rôle |
|----------|------|
| `RESEND_API_KEY` | Envoi des emails transactionnels |
| `RESEND_FROM_EMAIL` | Expéditeur (domaine vérifié chez Resend) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Push navigateur (`npx web-push generate-vapid-keys`) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Même clé publique (côté client) |
| `NOTIFICATION_WEBHOOK_SECRET` | Secret du webhook Supabase |
| `CRON_SECRET` | Secret du cron Vercel (file d’attente) |

### Webhook Supabase (livraison immédiate)

1. **Database → Webhooks → Create**
2. Table : `notification_outbox`, événement : **Insert**
3. URL : `https://votre-app.vercel.app/api/webhooks/notifications`
4. Header : `x-webhook-secret` = valeur de `NOTIFICATION_WEBHOOK_SECRET`

Le cron Vercel (`/api/cron/notification-delivery`, chaque minute) traite les lignes restantes si le webhook échoue.

### Côté utilisateur

- Préférences : **Notifications** (email / push)
- Bouton **Activer les notifications push** pour autoriser le navigateur

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
