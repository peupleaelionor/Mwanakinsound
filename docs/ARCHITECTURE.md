# Architecture — Mwanakin Sound

Ce document explique **pourquoi** le système est construit ainsi. Objectif :
passer de 1 000 à plusieurs millions d'utilisateurs sans réécriture.

## Principes directeurs

1. **Afrique-first** — chaque décision optimise le mobile, le faible débit et la consommation data.
2. **Server-first** — React Server Components par défaut ; on n'envoie du JS au client que pour l'interactivité réelle (player, formulaires).
3. **Sécurisé par défaut** — RLS default-deny ; les écritures sensibles passent par des RPC contrôlées.
4. **Modulaire** — chaque domaine vit dans `features/*` derrière une interface stable, pour ajouter podcasts / vidéos / marketplace sans refactor.
5. **Coût minimal** — Supabase + Vercel + R2 ; pas d'infra à gérer tant que l'échelle ne l'exige pas.

## Vue d'ensemble

```
                 ┌──────────────────────────────────────────┐
   Navigateur    │  Next.js (Vercel Edge/Node)              │
  (PWA mobile)   │                                          │
      │          │  RSC ── services/ ──► Supabase (RLS)     │
      │  HTML/RSC │   │                     │  Postgres      │
      ├──────────┤   │                     │  Auth          │
      │  audio    │  Client Components:     │  Storage       │
      │  preview  │   • player (Zustand)    │  Edge Functions│
      ▼           │   • auth form           └──────┬─────────┘
  Supabase Storage│   • search box                 │
  (previews)      └────────────────────────────────┼─────────┐
      ▼                                             ▼         │
  Cloudflare R2 + CDN  ◄───── audio master (signed) ─────────┘
```

## Flux de données

- **Lecture d'une page (RSC)** : le composant serveur appelle `services/*`, qui
  interroge Supabase avec le client _request-scoped_ (cookies → session → RLS).
  Le HTML streamé arrive vite ; les sections lourdes sont enveloppées de
  `<Suspense>` (streaming UI).
- **Lecture audio** : `<AudioController>` (headless, monté une fois) est le seul
  à toucher l'élément `<audio>`. L'UI (`PlayerBar`, `TrackShelf`) parle au store
  Zustand. Découplage total UI ↔ moteur audio.
- **Comptage des écoutes** : `record_stream` (RPC `SECURITY DEFINER`) valide le
  titre, incrémente les compteurs dénormalisés et écrit l'historique. Le client
  n'insère jamais dans `streams`.

## Recommandation

`features/recommendations/engine.ts` définit `RecommendationEngine`. La v1
(`SqlRecommendationEngine`) appelle la fonction SQL `recommend_tracks` — un score
explicable mêlant affinité de genre, langue/pays, fraîcheur et popularité
(amortie par `ln`). L'extension `vector` est déjà activée : une future
implémentation par embeddings/pgvector remplacera le corps sans toucher aux
appelants.

## Couche IA

`features/ai/provider.ts` — interface `AiProvider` (bio, classification,
traduction). Providers concrets chargés dynamiquement (`NullAiProvider` par
défaut). Aucune clé ni SDK vendeur dans le bundle client ; en production ces
appels tournent dans des Edge Functions Supabase avec rate-limiting.

## Stockage & audio

| Bucket                                     | Accès  | Usage                                                |
| ------------------------------------------ | ------ | ---------------------------------------------------- |
| `avatars`, `artist-covers`, `album-covers` | public | images, cache CDN                                    |
| `audio-preview`                            | public | extraits ~30s basse qualité (lecture instantanée)    |
| `audio-master`                             | privé  | masters, servis via URL signée / R2 pour les abonnés |

Le résolveur `lib/audio-url.ts` mappe un chemin stocké vers une URL jouable —
preview d'abord (économe), master ensuite. Migration future vers R2 = un seul
point de changement.

## Performance

- RSC + `optimizePackageImports` (icônes/motion tree-shakés).
- Images AVIF/WebP via `next/image`, cache long.
- Graphiques du studio en CSS pur — **zéro** librairie de charting côté client.
- Service worker : shell hors-ligne (stale-while-revalidate), jamais les flux audio.
- Objectif : First Load JS ~100 kB, chargement initial < 2 s sur 3G.

## Scalabilité — chemin de croissance

| Étape   | Levier                                                                                                             |
| ------- | ------------------------------------------------------------------------------------------------------------------ |
| 1k–100k | Supabase managé, indexes en place, compteurs dénormalisés                                                          |
| 100k–1M | `analytics_daily` (rollups) au lieu de scanner `streams` ; cache CDN agressif                                      |
| 1M+     | Partition de `streams`, read-replicas, moteur de reco par embeddings, R2 pour tout l'audio, séparation stockage/DB |

Aucune de ces étapes n'impose de réécriture : les interfaces (`services/*`,
`RecommendationEngine`, `AiProvider`, résolveur audio) isolent le changement.

## Modularité future

`features/*` accueille de nouveaux domaines (podcasts, vidéos, concerts live,
billetterie, marketplace) sans impacter l'existant. Chaque module expose ses
composants et son accès données ; les routes `app/*` composent ces modules.
