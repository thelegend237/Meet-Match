# Déployer Meet & Match sur Vercel

Guide pour la **première mise en ligne** (preview ou production).

## Prérequis

1. **Compte [Vercel](https://vercel.com)** (connecté au CLI : `npx vercel whoami`)
2. **Projet Supabase** en production avec les migrations appliquées (`supabase/MIGRATIONS.md`)
3. **Dépôt GitHub** : `https://github.com/thelegend237/meet-and-match`

## 1. Vérifier le build en local

```bash
npm install
npm run build
```

Le build doit se terminer sans erreur.

## 2. Pousser le code sur GitHub

```bash
git add .
git commit -m "Préparation déploiement Vercel"
git push origin main
```

## 3. Créer le projet Vercel

### Option A — Interface web (recommandé)

1. [vercel.com/new](https://vercel.com/new) → **Import** du repo `meet-and-match`
2. Framework : **Next.js** (détecté automatiquement)
3. **Ne pas modifier** la commande de build : `npm run build`
4. Ajouter les **variables d'environnement** (section 4 ci-dessous)
5. **Deploy**

### Option B — CLI

```bash
npx vercel link
npx vercel env pull .env.vercel   # optionnel, pour vérifier
npx vercel --prod
```

## 4. Variables d'environnement Vercel

Dans **Project → Settings → Environment Variables**, ajouter pour **Production**, **Preview** et **Development** :

| Variable | Obligatoire | Exemple / source |
|----------|-------------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Oui | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Oui | Clé **anon** (Dashboard Supabase → API) |
| `NEXT_PUBLIC_APP_URL` | Oui | `https://votre-app.vercel.app` (URL finale Vercel) |
| `SUPABASE_SERVICE_ROLE_KEY` | Recommandé | Clé **service_role** (scripts / admin, jamais côté client) |
| `GEOCODE_USER_AGENT` | Optionnel | `MeetAndMatch/1.0 (contact@votre-email.com)` |

Stripe (si paiements activés plus tard) :

| Variable | |
|----------|--|
| `STRIPE_SECRET_KEY` | |
| `STRIPE_WEBHOOK_SECRET` | |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | |

> Copiez les valeurs depuis votre `.env.local` local (sans les commiter).

## 5. Configurer Supabase Auth

Dans **Supabase → Authentication → URL Configuration** :

| Champ | Valeur |
|-------|--------|
| **Site URL** | `https://votre-app.vercel.app` |
| **Redirect URLs** | `https://votre-app.vercel.app/auth/callback` |
| | `https://votre-app.vercel.app/**` |

Pour les previews Vercel (`*.vercel.app`), ajoutez aussi :

```
https://*-votre-equipe.vercel.app/auth/callback
```

(Ou l’URL exacte de chaque preview si besoin.)

### OAuth Google / Facebook

Dans chaque fournisseur, autoriser la redirect URI :

```
https://votre-app.vercel.app/auth/callback
```

## 6. Base de données Supabase

1. Appliquer toutes les migrations (`000` → `014`) via SQL Editor ou `supabase db push`
2. Exécuter `seed.sql` (tarifs)
3. Optionnel : `seed_test_data.sql` pour la démo
4. Optionnel : `npm run seed:geo` (villes — nécessite `SUPABASE_SERVICE_ROLE_KEY` en local)

## 7. Créer un admin

Voir `supabase/README.md` — créer un utilisateur Auth puis :

```sql
UPDATE public.profiles
SET role = 'superadmin', status = 'active', registration_payment_status = 'free'
WHERE email = 'votre@email.com';
```

## 8. Vérifications après déploiement

- [ ] Page d’accueil `/` s’affiche
- [ ] Inscription `/inscription` et connexion `/connexion`
- [ ] Callback OAuth `/auth/callback` (pas d’erreur redirect)
- [ ] Espace membre `/decouvrir` après activation compte
- [ ] Admin `/admin` avec un compte superadmin

## Dépannage

| Problème | Solution |
|----------|----------|
| Build échoue sur Vercel | Relancer `npm run build` en local, corriger les erreurs, push |
| « Configuration Supabase manquante » | Vérifier `NEXT_PUBLIC_SUPABASE_*` sur Vercel + redéployer |
| Connexion OAuth échoue | Redirect URLs Supabase + fournisseur OAuth |
| Images profil cassées | Bucket `profile-photos` + policies storage Supabase |
| Villes vides à l’inscription | Migration `013` + `npm run seed:geo` |

## Domaine personnalisé (optionnel)

Vercel → **Settings → Domains** → ajouter votre domaine, puis mettre à jour :

- `NEXT_PUBLIC_APP_URL`
- Site URL et Redirect URLs Supabase
