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

## 🪙 MwanaCoins — points d'engagement social

> **Les MwanaCoins ne sont pas une monnaie.**
>
> Ce sont des **points d'engagement social** qui mesurent la participation à la
> communauté (écoutes, partages, commentaires, publications). Ils **n'ont aucune
> valeur monétaire** : ils ne peuvent être ni achetés, ni vendus, ni échangés
> contre de l'argent, ni convertis en crypto-actif. Il ne s'agit ni d'une
> monnaie, ni d'un substitut monétaire, ni d'un instrument financier.
>
> Cette séparation est garantie par l'architecture, pas seulement par la
> documentation : le grand livre `mwana_coins_ledger` n'a **aucune relation** avec
> les tables `payments` ou `subscriptions`, et l'interface `CreditEngine`
> n'expose **aucune** opération d'achat, de retrait, de conversion ou de
> transfert. Un test automatisé vérifie l'absence de cette surface d'API.

Attribution exclusivement côté serveur, via la RPC `award_mwana_coins`
(`SECURITY DEFINER`), avec plafonds journaliers anti-abus. Le client ne peut pas
écrire son propre solde.

## ⚡ Budget de performance (« Bandal Test »)

Chaque route doit rester **sous 200 kb de JS initial (gzip)** — sur un lien
Edge à ~400 kb/s, chaque tranche de 50 ko coûte environ une seconde avant le
premier son.

```bash
npm run budget    # build + vérification du budget par route
```

Cette vérification est **bloquante en CI**. Dernier rapport de mesures :
[`docs/perf/bandal-report-001.md`](docs/perf/bandal-report-001.md).

## 🔐 Sécurité

RLS activée sur **toutes** les tables (default-deny). Ingestion des écoutes via
RPC `SECURITY DEFINER` — le client n'écrit jamais de lignes arbitraires. Uploads
limités par type MIME et taille (voir migration `0007_storage.sql`).

## 📄 Licence

Propriétaire — © Mwanakin Sound. Tous droits réservés.
