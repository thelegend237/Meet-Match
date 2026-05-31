# Meet & Match — État des lieux (MVP)

> Dernière mise à jour : 31 mai 2026  
> Stack : Next.js 15 · React 19 · Supabase · Tailwind 4 · TypeScript

---

## Plan MVP en 10 étapes

| # | Étape | Statut | Commentaire |
|---|-------|--------|-------------|
| 1 | Architecture & routes | ✅ Fait | Fusion `profiles` + Auth, modules définis |
| 2 | Base de données Supabase | ✅ Fait | Migrations 001 → 005, seeds, RLS, Storage |
| 3 | Frontend public | ✅ Fait | Landing, tarifs, contact, inscription |
| 4 | Espace utilisateur | ✅ Fait | Profil, photos, découverte, likes, notifications |
| 5 | Dashboard admin | ✅ Fait | KPIs, users, matching, matchs, paiements, contact |
| 6 | Parcours match utilisateur | ✅ Fait | `/matchs`, paiement matching MVP, nav Rencontres |
| 7 | Messagerie accompagnée | ✅ Fait | `/messages`, Realtime, admin `/admin/conversations/matchs` |
| 8 | Paiements Stripe | ⏳ À faire | Checkout inscription + matching, webhooks |
| 9 | Sécurité & polish | ⏳ Partiel | RLS OK ; audit prod, rate limits, tests E2E |
| 10 | Déploiement | ⏳ À faire | Vercel, env prod, domaine, monitoring |

**Prochaine étape recommandée : Étape 8** — Paiements Stripe (voir fin de document).

---

## 1. Infrastructure & base de données

### Migrations Supabase

| Fichier | Contenu |
|---------|---------|
| `001_initial_schema.sql` | Enums, tables, vues `mutual_likes` / `visible_profiles` |
| `002_functions_triggers.sql` | RPC métier, triggers auth/likes/paiements/matchs |
| `003_rls_policies.sql` | RLS, bucket `profile-photos`, Realtime `messages` |
| `004_grants.sql` | Grants RPC + correctifs policies |
| `005_profile_discovery.sql` | `preferred_gender`, `is_verified`, `last_seen_at` |

### Données de test

- `seed.sql` — tarifs plateforme (`app_settings`)
- `seed_test_data.sql` — **130 comptes** (128 users + 2 admins), 120 profils bulk, likes, 1 match pending
- Doc : `supabase/TEST_DATA.md`
- Mot de passe test : `Test1234!`

### RPC exposées à l'app

| Fonction | Utilisée par |
|----------|--------------|
| `propose_match` | Admin → Proposer un match |
| `grant_free_access` | Admin → Accès gratuit |
| `update_match_status` | Admin → Clôturer un match |
| `create_admin_contact_chat` | API `/api/contact` |
| `soft_delete_user` | **DB only** — pas encore d'UI |
| `check_match_payment_status` | Trigger auto après paiement |

---

## 2. Routes & pages

### Public (`/`)

| Route | Statut |
|-------|--------|
| `/` | ✅ Landing + inscription inline |
| `/fonctionnement` | ✅ |
| `/tarifs` | ✅ |
| `/contact` | ✅ → API contact admin |

### Auth

| Route | Statut |
|-------|--------|
| `/inscription` | ✅ Supabase signUp + profil auto |
| `/connexion` | ✅ Redirect role-based (`/decouvrir` ou `/admin`) |
| `/mot-de-passe-oublie` | ✅ Reset email → `/profil/modifier` |
| `/auth/callback` | ✅ Exchange code session |

### Espace utilisateur

| Route | Statut |
|-------|--------|
| `/decouvrir` | ✅ **Home user** — suggestions, grille, filtres genre, badges |
| `/profil` | ✅ Aperçu profil |
| `/profil/modifier` | ✅ Édition style Badoo |
| `/profil/photos` | ✅ Upload Storage |
| `/notifications` | ✅ Liste + marquer lu |
| `/paiements` | ⚠️ Statut + historique — **pas de Stripe** |
| `/tableau-de-bord` | ✅ Stats + liens rapides |
| `/matchs` | ✅ **Mes matchs** — propositions, paiement, statuts |
| `/messages` | ✅ Liste + thread Realtime |
| `/messages/[chatId]` | ✅ Discussion accompagnée |

### Admin

| Route | Statut |
|-------|--------|
| `/admin` | ✅ KPIs + actions rapides |
| `/admin/utilisateurs` | ✅ Liste + accès gratuit |
| `/admin/matching` | ✅ Likes réciproques → proposer match |
| `/admin/matchs` | ✅ Suivi + clôture |
| `/admin/paiements` | ✅ Lecture seule |
| `/admin/conversations` | ✅ Contact visiteurs |
| `/admin/conversations/matchs` | ✅ Discussions matchs accompagnées |
| `/admin/conversations/[id]` | ✅ Thread Realtime (contact + match) |

---

## 3. Workflows fonctionnels

### ✅ Parcours visiteur → inscription

```
/ → #inscription ou /inscription → Supabase Auth → profil créé (trigger)
→ redirect /decouvrir (si payé/free) ou bannière paiement
```

### ✅ Parcours découverte & like

```
/decouvrir → profils actifs payés/free avec photo
→ Filtre Hommes / Femmes / Tous (persisté preferred_gender)
→ Suggestions du jour (scoring préférences)
→ Clic profil → modal → Like → notification + trigger DB
```

### ✅ Parcours admin matching

```
admin@meetandmatch.test → /admin/matching
→ Couples likes réciproques (vue mutual_likes)
→ Proposer match → RPC propose_match → paiements matching créés
→ /admin/matchs → clôturer (réussi / échoué / annulé)
```

### ✅ Parcours match utilisateur

```
/matchs → match pending_payment → paiement matching (RPC confirm_matching_payment)
→ les 2 parties paient → match active + chat_group créé (trigger DB)
→ /messages ou bouton « Ouvrir la discussion » sur le match actif
→ échanges Realtime (users + admin participant)
```

### ✅ Messagerie accompagnée

```
Utilisateur : /messages → liste des chats → /messages/[chatId]
Admin : /admin/conversations/matchs → thread avec Realtime
RLS : envoi si chat open + match active (users) ou staff admin
```

### ✅ Contact admin

```
/contact → POST /api/contact → create_admin_contact_chat
→ /admin/conversations → réponse admin
```

### ⚠️ Paiements Stripe (incomplet)

```
UI /paiements : affiche statut, bouton "bientôt"
DB : table payments prête (stripe_session_id, provider)
Package stripe : non installé, pas de webhook, pas de Checkout
```

---

## 4. Vérifications techniques (31/05/2026)

| Vérification | Résultat |
|--------------|----------|
| `npm run build` | ✅ OK — 25 routes compilées |
| `npm run typecheck` | ✅ OK |
| Supabase Auth (sophie@test.com) | ✅ OK |
| Profils discovery (API REST) | ✅ Données présentes |
| Vue `mutual_likes` | ✅ OK |
| RPC `propose_match` | ✅ Testé précédemment |
| Middleware protection routes | ✅ user/admin/auth redirects |

### Corrections appliquées lors de l'audit

- Reset mot de passe : redirect corrigé vers `/profil/modifier` (page `/profil/parametres` n'existait pas)
- Seed : nettoyage `admin_logs` avant delete users
- Admin actions : gestion erreurs client (plus de crash Fast Refresh)

---

## 5. Composants & actions clés

### Server actions

| Fichier | Actions |
|---------|---------|
| `profile.ts` | `updateProfile` |
| `photos.ts` | upload, primary, delete |
| `likes.ts` | `likeProfile`, `getMyLikedIds` |
| `discover.ts` | `updatePreferredGender`, `touchLastSeen` |
| `notifications.ts` | read, unread count |
| `admin.ts` | propose match, update status, grant access, message |

### UI notable

- `discover-feed.tsx` — carousel suggestions + grille + filtres
- `profile-detail-modal.tsx` — fiche profil + like
- `profile-card-badges.tsx` — en ligne / vérifié / nouveau (<30j)
- `admin-sidebar.tsx` — navigation + déconnexion

---

## 6. Variables d'environnement

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # webhooks Stripe (futur)
STRIPE_SECRET_KEY=...           # étape 8
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 7. Lacunes connues (à traiter)

1. **Stripe** — checkout + webhooks (étape 8)
2. **Suppression compte** — RPC existe, pas d'UI
3. **Migration 006** — RPC `confirm_matching_payment` à exécuter si pas encore fait

---

## 8. Prochaine étape — Étape 8 : Paiements Stripe

### Objectif

Remplacer le paiement matching MVP (RPC manuelle) par Stripe Checkout + webhooks.

### Livrables suggérés

1. **Checkout inscription** — activation profil après paiement
2. **Checkout matching** — déclenchement auto `check_match_payment_status`
3. **Webhooks** — `payment_intent.succeeded`, idempotence
4. **Page `/paiements`** — liens Stripe Customer Portal (optionnel)

---

## Comptes de test rapides

| Email | Rôle | Usage |
|-------|------|-------|
| `sophie@test.com` | user payé | Découvrir, likes |
| `pierre@test.com` | user impayé | Test gate paiement |
| `admin@meetandmatch.test` | admin | Backoffice |
| `user001@test.com` … `user120@test.com` | bulk | Volume discovery |

Mot de passe : **`Test1234!`**
