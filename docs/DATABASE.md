# Base de données — Mwanakin Sound

PostgreSQL via Supabase. Migrations versionnées dans `supabase/migrations`,
appliquées dans l'ordre numérique.

## Migrations

| Fichier                         | Contenu                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------- |
| `0001_extensions_and_enums.sql` | Extensions (pgcrypto, pg_trgm, unaccent, vector, citext) & enums de domaine   |
| `0002_core_schema.sql`          | `profiles`, `genres`, `artists`, `albums`, `tracks`, `track_genres` + indexes |
| `0003_social.sql`               | `playlists`, `playlist_tracks`, `likes`, `comments`, `followers` + compteurs  |
| `0004_streams_analytics.sql`    | `streams`, `analytics_daily`, `subscriptions`, `payments`, `play_history`     |
| `0005_rls_policies.sql`         | RLS default-deny + policies least-privilege                                   |
| `0006_functions.sql`            | `handle_new_user`, `record_stream`, `recommend_tracks`                        |
| `0007_storage.sql`              | Buckets Storage + policies (chemin préfixé par `auth.uid()`)                  |

## Modèle relationnel (résumé)

```
auth.users ──1:1──► profiles ──1:0..1──► artists ──1:N──► albums
                        │                    │
                        │                    └──1:N──► tracks ──N:M──► genres
                        │                                  │
     playlists ◄──N:M── playlist_tracks ───────────────────┘
        │
   likes / comments / followers / play_history / streams
        │
   subscriptions / payments
```

`profiles` est la table « users » du domaine ; elle étend `auth.users` 1:1
(l'authentification reste gérée par Supabase Auth). Un trigger
`handle_new_user` crée le profil + un abonnement `free` à l'inscription.

## Sécurité (RLS)

- **Default-deny** : RLS activée sur toutes les tables ; aucune ligne visible sans policy explicite.
- **Lecture publique** limitée au contenu `published` (artistes, albums, titres).
- **Écriture** réservée au propriétaire (`owner_id = auth.uid()`), via les helpers `is_artist_owner()` / `auth_role()`.
- **`streams` / `subscriptions` / `payments`** : jamais écrits par le client. `streams` via RPC `record_stream`; facturation via Edge Function (service role).
- **Storage** : un utilisateur n'écrit que sous son préfixe `{auth.uid()}/…`. Les masters audio sont dans un bucket **privé**.

## Indexes clés

- Découverte : `idx_tracks_status_published`, `idx_tracks_play_count`.
- Recherche floue : GIN trigram sur `tracks.title` et `artists.name`.
- Analytics : `idx_streams_artist_time`, `idx_analytics_artist_day`.
- Locale : `idx_artists_country`.

## Compteurs dénormalisés

`tracks.play_count` et `tracks.like_count` sont maintenus par trigger / RPC pour
éviter tout `COUNT(*)` sur le chemin chaud de la découverte. `analytics_daily`
pré-agrège les écoutes pour le studio (jamais de scan de `streams` en requête).

## Régénérer les types

```bash
npm run db:types   # supabase gen types typescript --linked > types/database.types.ts
```
