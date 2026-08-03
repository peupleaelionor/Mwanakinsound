# Réseau social minimaliste — schéma & API

Couche sociale greffée sur les podcasts/épisodes (migration `0010_social.sql`).
Distincte de `public.comments` (0003), réservée aux morceaux.

## Schéma

```
podcasts ─┐                        ┌─ comment_reactions (emoji ❤️🔥🙏🎶)
          ├─ social_comments ──────┤
podcast_  ┘   (content<=280,       └─ (unique user_id+comment_id+emoji)
episodes      hashtags text[])
          └─ social_shares (share_link, cible = podcast|épisode)
```

- **`social_comments`** — `content` contraint à 1–280 caractères ; `hashtags`
  recalculés par trigger (`sync_comment_hashtags` → `extract_hashtags`, regex) à
  chaque écriture ; contrainte `one_target` : podcast **ou** épisode, jamais les
  deux. Index GIN sur `hashtags`.
- **`comment_reactions`** — emoji contraint à `❤️ 🔥 🙏 🎶` ; unicité par
  (utilisateur, commentaire, emoji) → toggle idempotent.
- **`social_shares`** — journal des partages, alimente l'engagement.

RLS : lecture publique (contenu social) ; écriture restreinte à
`user_id = auth.uid()`. `social_user_stats(uuid)` agrège les compteurs pour les
badges (calculés côté app, cf. `features/social/badges.ts`).

## API REST (route handlers Next.js)

| Méthode & route                                          | Rôle                                                                  |
| -------------------------------------------------------- | --------------------------------------------------------------------- |
| `GET /api/comments?episodeId=…\|podcastId=…&before=ISO`  | Fil paginé **10/10** (keyset sur `created_at`), enrichi des réactions |
| `POST /api/comments` `{episodeId?\|podcastId?, content}` | Crée un commentaire **après modération**. Auth requise, ≤280          |
| `POST /api/reactions` `{commentId, emoji}`               | Bascule une réaction (ajoute/retire)                                  |
| `POST /api/shares` `{episodeId?\|podcastId?, shareLink}` | Journalise un partage                                                 |

Modération : `features/moderation` — garde local (longueur + liste noire,
toujours actif) puis **Perspective API** si `PERSPECTIVE_API_KEY` est défini,
borné dans le temps et **fail-open** (une panne ne bloque jamais l'utilisateur).

## Frontend

- **`CommentSection`** — chargement paresseux 10/10, compteur 280, publication.
- **`ReactionButton`** — 4 emojis, optimiste avec rollback.
- **`ShareModal`** — deep-links WhatsApp/SMS/copie (réutilise `features/share`).
- **`CommentBody`** (serveur) — transforme `#hashtag` en lien vers `/tags/{tag}`.
- Pages : `/episodes/[id]` (lecteur + fil), `/tags/[tag]` (fil par hashtag),
  fil de série sur `/podcasts/[slug]`.

## Choix assumés (cf. docs/STACK_DECISIONS.md)

- **Hashtags par regex** (SQL + TS), pas spaCy : un modèle NLP Python est
  contraire à la discipline 2G pour un besoin que la regex couvre exactement.
- **Recommandations ALS** : reportées. La reco v1 reste SQL ; un moteur ML podcast
  viendra derrière la même interface `RecommendationEngine`.
- **Tests** : la base de code utilise **Vitest** (pas Jest). La logique pure
  (hashtags, badges, garde de modération) est couverte. Les **E2E Cypress sous
  profil 2G** restent à câbler via le harnais Bandal (ISSUE-02).
