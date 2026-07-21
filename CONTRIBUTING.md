# Contribuer à Mwanakin Sound

Merci de contribuer ! Un nouveau développeur doit pouvoir être productif en
moins de 30 minutes — voir [README](README.md#-démarrage-rapide--5-min).

## Workflow

1. Branche depuis `main` : `git checkout -b feat/ma-fonctionnalite`.
2. Développez. Gardez les modules dans `features/*` isolés.
3. Avant de commit, la CI locale (Husky + lint-staged) formate et lint le code modifié.
4. Assurez-vous que `npm run typecheck`, `npm run test` et `npm run build` passent.
5. Ouvrez une Pull Request vers `main`. La CI (lint · typecheck · test · build) doit être verte.

## Conventions de commit

Format [Conventional Commits](https://www.conventionalcommits.org/) :

```
<type>(<portée>): <description>

feat(player): ajout de la file d'attente
fix(auth): corrige la redirection post-connexion
docs(architecture): précise le flux audio
```

Types : `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`.

## Standards de code

- **TypeScript strict** — pas de `any` implicite, `noUncheckedIndexedAccess` actif.
- **Server Components par défaut** ; `'use client'` uniquement si nécessaire.
- **Accès données** dans `services/*` (serveur) — jamais de requête Supabase directe dans un composant serveur de page.
- **Nommage** : composants `PascalCase`, hooks `useXxx`, fichiers `kebab-case`.
- **Pas de** code temporaire, hack, dépendance inutile ou duplication.

## Base de données

Toute modification de schéma = **nouvelle** migration numérotée dans
`supabase/migrations` (jamais éditer une migration déjà appliquée). Pensez RLS
et indexes. Régénérez les types : `npm run db:types`.

## Tests

Ajoutez des tests Vitest pour la logique métier (stores, utilitaires, services
purs). Les fichiers `*.test.ts(x)` sont découverts automatiquement.
