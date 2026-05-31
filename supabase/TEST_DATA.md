# Données de test — Meet & Match

## Installation

1. Appliquer les migrations (`001` → `004`) si ce n'est pas déjà fait
2. Exécuter `seed.sql` (paramètres tarifaires)
3. Exécuter **`seed_test_data.sql`** dans le **SQL Editor** Supabase

```sql
-- Coller le contenu de supabase/seed_test_data.sql
```

> Le script supprime puis recrée les comptes `@test.com` et `@meetandmatch.test`.

## Mot de passe (tous les comptes)

```
Test1234!
```

## Volume de données

| Type | Quantité |
|------|----------|
| Comptes admins | 2 |
| Utilisateurs nommés | 8 |
| Utilisateurs bulk | 120 |
| **Total comptes** | **130** |
| Profils visibles discovery (~) | ~110 |
| Likes réciproques (admin matching) | ~23 paires |
| Match pending_payment | 1 (Sophie ↔ Thomas) |

## Comptes nommés (scénarios documentés)

| Email | Rôle | Discovery |
|-------|------|-------------|
| `superadmin@meetandmatch.test` | superadmin | — |
| `admin@meetandmatch.test` | admin | — |
| `sophie@test.com` | user | ✅ payé |
| `thomas@test.com` | user | ✅ payé |
| `marie@test.com` | user | ✅ payé |
| `lucas@test.com` | user | ✅ gratuit |
| `emma@test.com` | user | ✅ payé |
| `pierre@test.com` | user | ❌ impayé |
| `claire@test.com` | user | ✅ payé |
| `julien@test.com` | user | ✅ payé |

## Comptes bulk

Emails : `user001@test.com` … `user120@test.com`

- ~85 % payés actifs
- ~8 % accès gratuit actifs
- ~7 % impayés inactifs
- 20 villes (FR, BE, CH, CA, CM, CI)
- 15 profils « récents » (< 15 jours) pour tester les suggestions
- Photos via `pravatar.cc`

## Données incluses

- **128 profils utilisateur** avec photo
- **Likes réciproques** : comptes nommés + 20 paires bulk
- **~150 likes** unidirectionnels supplémentaires
- **1 match** `pending_payment` Sophie ↔ Thomas
- **Paiements** inscription (payé / gratuit / impayé)
- **1 ticket** contact admin (visiteur)

## Scénarios de test

| Action | Compte |
|--------|--------|
| Découvrir 100+ profils | `sophie@test.com` |
| Suggestions du jour | `sophie@test.com` → `/decouvrir` |
| Profil sans accès discovery | `pierre@test.com` |
| Match en attente de paiement | `sophie@test.com` ou `thomas@test.com` |
| Dashboard admin / matching | `admin@meetandmatch.test` |
| Likes réciproques admin | `admin@meetandmatch.test` → Matching |

## Connexion rapide

```
Email    : sophie@test.com
Password : Test1234!
URL      : http://localhost:3000/connexion
```

Après connexion → `/decouvrir` avec **100+ profils** recommandés et en grille.
