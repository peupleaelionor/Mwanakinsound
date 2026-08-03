<div align="center">

# 🎵 Mwanakin Sounds

**Le son du continent, à portée du monde.**

Plateforme musicale nouvelle génération née en RDC — pensée pour l'Afrique
(mobile-first, faible débit, data-saver) et ouverte au monde.

[![CI](https://github.com/peupleaelionor/Mwanakinsound/actions/workflows/ci.yml/badge.svg)](https://github.com/peupleaelionor/Mwanakinsound/actions/workflows/ci.yml)

</div>

---

## ✨ Fonctionnalités

- **Découverte** — nouveaux sons, tendances RDC & Afrique, artistes populaires, recommandations personnalisées.
- **Lecteur** — lecture instantanée, file d'attente, répétition, aléatoire, historique + **vue plein écran « Now Playing »** animée.
- **Command palette ⌘K** — navigation & recherche instantanée (façon Linear/Raycast), lecture en un clic.
- **Likes optimistes** — réaction instantanée avec réconciliation serveur.
- **Espace artiste** — profil, **upload de titres** (drag & drop, validation, publication immédiate), catalogue, statistiques détaillées.
- **Live listeners** — compteur d'auditeurs **en temps réel** (Supabase Realtime) sur les pages artiste.
- **Recherche** — artistes & titres, tolérante aux fautes (trigram).
- **Couche IA** — génération de bios, classification, traduction de paroles (provider-agnostique).
- **Afrique-first** — **mode économie de données** (persisté au profil), classement par pays, mise en avant des talents locaux.
- **PWA installable** — invite d'installation native, shell hors-ligne, thème sombre premium, toasts élégants.
- **Résilient sur Vercel** — se déploie et s'affiche **sans 500** même avant configuration Supabase (états vides, zéro hang réseau).

## 🧱 Stack

| Couche        | Technologie                                                                            | Pourquoi                                       |
| ------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Frontend      | Next.js 15 (App Router, RSC), TypeScript strict, Tailwind, shadcn-style, Framer Motion | Moins de JS côté mobile, rendu serveur rapide  |
| État audio    | Zustand                                                                                | Store global découplé de l'UI                  |
| Backend       | Supabase (Postgres, Auth, Storage, RLS, Edge Functions)                                | Tout-en-un, coût minimal, sécurisé par défaut  |
| Audio massif  | Cloudflare R2 + CDN                                                                    | Stockage master économique, diffusion mondiale |
| Hébergement   | Vercel                                                                                 | CI/CD Git, edge, optimisation images           |
| Observabilité | Sentry, Plausible (prévus)                                                             | Erreurs & analytics produit                    |

## 🚀 Démarrage rapide (< 5 min)

```bash
# 1. Dépendances
npm install

# 2. Variables d'environnement
cp .env.example .env.local
#   → renseignez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Base de données (projet Supabase lié)
npm run db:migrate      # applique supabase/migrations
npm run db:seed         # données de référence

# 4. Lancer
npm run dev             # http://localhost:3000
```

> Sans identifiants Supabase, l'app démarre quand même (placeholders inertes) —
> pratique pour explorer l'UI. Les requêtes de données resteront vides.

## 📜 Scripts

| Commande             | Rôle                               |
| -------------------- | ---------------------------------- |
| `npm run dev`        | Serveur de développement           |
| `npm run build`      | Build de production                |
| `npm run test`       | Tests unitaires (Vitest)           |
| `npm run lint`       | ESLint                             |
| `npm run typecheck`  | Vérification TypeScript stricte    |
| `npm run db:migrate` | Applique les migrations Supabase   |
| `npm run db:seed`    | Seed la base                       |
| `npm run db:types`   | Régénère `types/database.types.ts` |

## 🗂️ Structure

```
app/          Routes App Router (pages, layouts, route handlers)
components/    UI réutilisable (ui/ = primitives shadcn-style, layout/)
features/      Modules métier isolés (player, recommendations, ai, analytics, auth, artists, search)
services/      Accès données côté serveur (catalog, search, studio)
lib/           Utilitaires transverses (supabase, env, audio-url, utils)
types/         Types de domaine & base de données
supabase/      Migrations SQL versionnées, config, seed
tests/         Tests unitaires
docs/          Documentation d'architecture
```

## 📚 Documentation

- [Architecture](docs/ARCHITECTURE.md) — décisions techniques, flux de données, scalabilité.
- [Base de données](docs/DATABASE.md) — schéma, RLS, indexes.
- [Contribution](CONTRIBUTING.md) — workflow, conventions de commit.

## 🔐 Sécurité

RLS activée sur **toutes** les tables (default-deny). Ingestion des écoutes via
RPC `SECURITY DEFINER` — le client n'écrit jamais de lignes arbitraires. Uploads
limités par type MIME et taille (voir migration `0007_storage.sql`).

## 📄 Licence

Propriétaire — © Mwanakin Sound. Tous droits réservés.
