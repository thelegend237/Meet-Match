# Mise en production — base vide, vrais utilisateurs

Guide pour **vider la base de test** et accueillir de **vrais inscrits** (bêta ou production).

## Ce que vous allez obtenir

| Conservé | Supprimé |
|----------|----------|
| Schéma + migrations (`001` → `018`) | Tous les comptes Auth |
| Tarifs (`app_settings` / `seed.sql`) | Profils, likes, matchs, messages |
| Villes (`geo_cities`, ~30 par défaut) | Notifications, paiements, photos Storage |
| Fonctions & triggers | Comptes `@test.com`, `@meetandmatch.test` |

---

## Checklist (≈ 20 min)

### 1. Sauvegarde (recommandé)

Supabase → **Database → Backups** (plan Pro) ou export manuel des tables importantes avant reset.

### 2. Migrations à jour

Dans le **SQL Editor**, vérifiez que **toutes** les migrations sont appliquées — voir [MIGRATIONS.md](./MIGRATIONS.md) jusqu’à **`018_admin_role_management.sql`**.

Si une migration manque, appliquez-la **avant** le reset.

### 3. Vider les photos Storage (optionnel mais recommandé)

Supabase **interdit** la suppression SQL directe sur `storage.objects`. Deux options :

**Option A — script (recommandé)** — à la racine du projet, avec `.env.local` configuré :

```bash
npm run storage:empty-photos
```

**Option B — Dashboard** : **Storage → profile-photos** → sélectionner tout → Delete.

Les anciennes photos de test restent dans Storage si vous sautez cette étape (sans impact sur la base SQL).

### 4. Vider la base SQL

1. Ouvrir **SQL Editor → New query**
2. Coller le contenu de **[scripts/reset_production_data.sql](./scripts/reset_production_data.sql)** (version **sans** `DELETE FROM storage.objects`)
3. **Run**

Résultat attendu en bas :

```
auth_users: 0 | profiles: 0 | matches: 0 | likes: 0 | chats: 0
geo_cities: ~30+ | app_settings: ~10
```

> **Ne pas exécuter** `seed_test_data.sql` après cette étape.

### 5. (Optionnel) Référentiel villes complet

Pour l’autocomplete inscription (toutes les villes > 5 000 hab.) :

```bash
npm run seed:geo
```

Variables dans `.env.local` : `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

Sans cette étape, les ~30 villes de la migration `013` restent disponibles (Paris, Montréal, Douala, etc.).

### 6. Vérifier les paramètres tarifaires

Si `app_settings` est vide (nouveau projet), exécuter **`seed.sql`**.

Sinon, rien à faire — les tarifs CAD (42 / 72) viennent de la migration `015`.

### 7. Créer votre super administrateur

1. **Authentication → Users → Add user**  
   Utilisez **votre vrai email** (pas `@test.com`).

2. **SQL Editor** :

```sql
UPDATE public.profiles
SET role = 'superadmin', status = 'active', registration_payment_status = 'free'
WHERE email = 'VOTRE@EMAIL.com';

INSERT INTO public.admin_profiles (id, title, is_active)
SELECT id, 'Super Administrateur', TRUE
FROM public.profiles
WHERE email = 'VOTRE@EMAIL.com'
ON CONFLICT (id) DO UPDATE SET is_active = TRUE, title = EXCLUDED.title;
```

3. Connexion sur l’app → **`/admin`**

### 8. Config production (rappel)

| Où | Quoi |
|----|------|
| **Vercel** | `NEXT_PUBLIC_APP_URL`, clés Supabase |
| **Supabase Auth** | Site URL + redirect `/auth/callback` |
| **Supabase Auth → Email** | Désactiver « Confirm email » pour bêta fluide (optionnel) |

Voir aussi [DEPLOY_VERCEL.md](../DEPLOY_VERCEL.md).

### 9. Vérifications finales

- [ ] `/` — landing OK
- [ ] `/inscription` — création compte avec **nouvel email**
- [ ] Onboarding → paiement simulé → `/decouvrir`
- [ ] `/contact` — message reçu côté admin
- [ ] Admin → promouvoir un **admin** via **Utilisateurs → Rôle et accès** (migration 018)

---

## Promouvoir d’autres admins (sans Supabase)

1. Le membre s’inscrit normalement sur `/inscription`
2. Super admin → **Admin → Utilisateurs** → fiche du membre
3. **Rôle et accès** → **Administrateur** → **Enregistrer**

---

## Retirer seulement les données de test (sans tout vider)

Si vous avez des **vrais comptes** à garder et voulez seulement supprimer `@test.com` / `@meetandmatch.test` :

→ Exécuter le bloc **« Nettoyage des données de test existantes »** au début de `seed_test_data.sql`  
→ **Sans** exécuter la suite du fichier (création des 130 comptes).

---

## Repartir de zéro sur un nouveau projet Supabase

Alternative la plus propre :

1. Créer un **nouveau projet** Supabase (dédié Meet & Match)
2. Appliquer migrations `001` → `018`
3. Exécuter `seed.sql`
4. (Optionnel) `npm run seed:geo`
5. Créer le superadmin (étape 6)
6. Mettre à jour les variables Vercel avec le nouveau projet

Ne pas réutiliser un projet avec un autre schéma (ex. Control-Flow) — voir [MIGRATIONS.md](./MIGRATIONS.md).

---

## Message type pour vos testeurs

> Meet & Match — bêta privée  
> https://meet-and-match.vercel.app  
>  
> Créez votre compte avec votre email. Les paiements sont simulés ; les matchs sont proposés par notre équipe.  
> Contact : page **Contact** sur le site.
