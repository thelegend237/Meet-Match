# Meet & Match

Plateforme de rencontres sérieuses **accompagnées** — matching humain par l'équipe, pas de chat direct entre utilisateurs avant mise en relation.

## Démarrage

```bash
cp .env.example .env.local
# Renseigner NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY

npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

> **Note Windows** : le dossier `Meet&Match` contient un `&` qui peut poser problème à npm. Les scripts utilisent `node node_modules/next/...` pour contourner ce bug.

### Base de données

1. Exécuter les migrations `supabase/migrations/001` → `006` dans Supabase SQL Editor
2. Exécuter `supabase/seed.sql` puis `supabase/seed_test_data.sql` (optionnel)
3. Voir `supabase/README.md` et `supabase/TEST_DATA.md`

## État d'avancement

**Documentation complète : [`docs/ETAT_DES_LIEUX.md`](docs/ETAT_DES_LIEUX.md)**

| Étape | Statut |
|-------|--------|
| 1–2 Architecture & BDD | ✅ |
| 3 Frontend public | ✅ |
| 4 Espace utilisateur | ✅ |
| 5 Dashboard admin | ✅ |
| 6 Parcours match user | ✅ |
| 7 Messagerie match | ✅ |
| 8 Stripe | ⏳ |
| 9–10 Sécurité & déploiement | ⏳ |

## Routes principales

### Public
`/`, `/fonctionnement`, `/tarifs`, `/contact`, `/inscription`, `/connexion`

### Utilisateur (connecté)
`/decouvrir` (home), `/matchs`, `/messages`, `/profil`, `/profil/modifier`, `/profil/photos`, `/notifications`, `/paiements`, `/tableau-de-bord`

### Admin
`/admin`, `/admin/utilisateurs`, `/admin/matching`, `/admin/matchs`, `/admin/paiements`, `/admin/conversations`, `/admin/conversations/matchs`

## Test rapide

```
Email    : sophie@test.com
Password : Test1234!
Admin    : admin@meetandmatch.test / Test1234!
```

## Charte graphique

- **Primary** : `#2e2a5f` · **Secondary** : `#d4145a`
- **Typo** : Playfair Display (titres) + Inter (corps)
- **Logo** : `public/logo.png`

## Structure

```
src/
├── app/
│   ├── (public)/, (auth)/, (user)/
│   ├── admin/
│   ├── api/contact/
│   └── auth/callback/
├── components/  public · user · admin · ui
└── lib/         actions · auth · discover · supabase
supabase/        migrations · seeds
docs/            ETAT_DES_LIEUX.md
```
