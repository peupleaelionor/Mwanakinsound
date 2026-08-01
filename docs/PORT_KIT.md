# Kit de portage — Backend Mwanakinsound → kinshasa-beats

Cible : `peupleaelionor/kinshasa-beats@feat/port-backend`
Source : `peupleaelionor/mwanakinsound@claude/mwanakin-sound-architecture-6muhue`

> ⚠️ **kinshasa-beats est une app Vite/React (SPA), pas Next.js.** Deux
> conséquences majeures :
>
> 1. Les variables d'env sont préfixées **`VITE_`** (pas `NEXT_PUBLIC_`).
> 2. Pas de SSR / route handlers : le client Supabase tourne **dans le
>    navigateur** → toute la sécurité repose sur **RLS + RPC** (raison de plus
>    pour porter nos policies telles quelles).

---

## 1. Fichiers SQL à appliquer (ordre strict)

Copier `supabase/migrations/*` et `supabase/config.toml` de la source. Ordre :

| #   | Fichier                         | Rôle                                                                               | Risque de collision Lovable                         |
| --- | ------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------- |
| 1   | `0001_extensions_and_enums.sql` | extensions (pgcrypto, pg_trgm, unaccent, vector, citext) + enums                   | Faible (idempotent `if not exists`)                 |
| 2   | `0002_core_schema.sql`          | profiles, artists, albums, tracks, track_genres + triggers + indexes               | **ÉLEVÉ** — Lovable crée souvent `profiles`         |
| 3   | `0003_social.sql`               | playlists, playlist_tracks, likes, comments, followers + `sync_track_like_count()` | Moyen                                               |
| 4   | `0004_streams_analytics.sql`    | streams, analytics_daily, subscriptions, payments, play_history                    | Faible                                              |
| 5   | `0005_rls_policies.sql`         | RLS default-deny + policies least-privilege                                        | **ÉLEVÉ** — policies dupliquées                     |
| 6   | `0006_functions.sql`            | `handle_new_user`, `record_stream`, `recommend_tracks`                             | **ÉLEVÉ** — trigger `on_auth_user_created` dupliqué |
| 7   | `0007_storage.sql`              | buckets + policies Storage                                                         | Moyen (buckets déjà créés ?)                        |
| —   | `seed.sql`                      | genres de référence (idempotent)                                                   | Faible                                              |

---

## 2. `.env.example` adapté à Vite (kinshasa-beats)

```dotenv
# --- Supabase (exposé au navigateur — préfixe VITE_) ---
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# --- App ---
VITE_SITE_URL=http://localhost:5173
VITE_APP_NAME=Mwanakin Sound

# --- Storage/CDN (optionnel, audio master) ---
VITE_R2_PUBLIC_URL=

# ⚠️ NE JAMAIS exposer la service_role au client Vite.
# Les opérations privilégiées (billing, IA) passent par des Edge Functions
# Supabase, où SUPABASE_SERVICE_ROLE_KEY reste côté serveur uniquement.
```

Dans le code Lovable, remplacer les accès env par `import.meta.env.VITE_*`.
Client Supabase (une seule instance navigateur) :

```ts
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
```

---

## 3. Checklist de réconciliation Lovable ↔ Mwanakinsound

Avant d'appliquer, **inspecter le schéma existant de kinshasa-beats** dans
Supabase (Studio → Database) et traiter chaque point :

- [ ] **Table `profiles`** — existe déjà côté Lovable ? Si oui : ne pas la
      recréer. Écrire une migration **`0008_convergence.sql`** qui fait
      `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` pour nos colonnes manquantes
      (`role`, `country_code`, `data_saver`, `preferred_language`…) au lieu de
      `CREATE TABLE`.
- [ ] **Trigger `on_auth_user_created` / `handle_new_user`** — Lovable en a
      souvent un. **Un seul doit survivre** : `DROP TRIGGER IF EXISTS` l'ancien,
      garder le nôtre (gère collisions de username + bootstrap abonnement).
- [ ] **Policies RLS** — préfixe/nom identiques ? Faire `DROP POLICY IF EXISTS`
      avant chaque `CREATE POLICY` pour éviter les doublons.
- [ ] **Enums** — si Lovable a des types équivalents, réutiliser les nôtres ou
      `ALTER TYPE ... ADD VALUE IF NOT EXISTS`.
- [ ] **Buckets Storage** — déjà créés ? `insert ... on conflict (id) do nothing`
      (déjà géré dans `0007`). Vérifier les limites MIME/taille.
- [ ] **Tables métier** (`artists`, `tracks`, `albums`…) — probablement absentes
      côté Lovable → application directe OK.
- [ ] **`auth.users`** — ne jamais y toucher (géré par Supabase Auth).

### Procédure recommandée

1. `supabase db diff` (ou dump du schéma Lovable) pour capturer l'état actuel.
2. Écrire **une** migration de convergence `0008_convergence.sql` : `DROP ... IF
EXISTS` des objets Lovable en conflit + `ADD COLUMN IF NOT EXISTS` pour aligner.
3. Appliquer 0001→0007 **puis** 0008 sur une **base de préproduction** d'abord.
4. `supabase gen types typescript` → régénérer les types côté kinshasa-beats.
5. Câbler l'UI Lovable sur les RPC : `record_stream`, `recommend_tracks`.

---

## 4. Ce que le front Lovable doit appeler (contrats stables)

- **Compter une écoute** : `supabase.rpc('record_stream', { p_track_id, p_ms_played, p_completed })`
- **Recommandations** : `supabase.rpc('recommend_tracks', { p_limit: 20 })`
- **Like** : `insert`/`delete` sur `likes` (RLS garantit `user_id = auth.uid()`)
- **Upload** : `storage.from('audio-preview').upload('{uid}/...')` puis `insert` dans `tracks`

Ces signatures sont stables : le front Lovable peut s'y brancher sans connaître
l'implémentation SQL.

```

```
