# Prompt Lovable — MWANAKIN SOUND

> Colle ce prompt dans Lovable (lovable.dev). Connecte l'intégration **Supabase**
> dès le début (bouton Supabase en haut à droite) pour que l'auth, la base et le
> storage soient créés automatiquement.

---

Construis **MWANAKIN SOUND**, une plateforme de streaming musical premium née en
RDC, pensée pour l'Afrique (mobile-first, faible débit, data-saver, Android) et
ouverte au monde. Qualité produit au niveau de Spotify / Apple Music / Tidal,
mais avec une identité africaine unique.

## Stack

React + Vite + TypeScript strict, Tailwind CSS, shadcn/ui, Framer Motion,
React Router, Zustand (état du lecteur), TanStack Query (données), et
**Supabase** (Auth email + Postgres + Storage + Row Level Security + Realtime).
PWA installable, responsive mobile-first.

## Direction artistique

Identité « nuit obsidienne + or congolais ». Thème **sombre par défaut**, thème
clair supporté. Tokens (CSS variables, mode sombre) :

- background `#0B0B0D`, surface/cards `#161618`, texte `#F5F1E8`
- primary (or) `hsl(41 96% 56%)`, accent (terracotta) `hsl(14 84% 58%)`
- radius 0.75rem, police display « Outfit », texte « Inter »
- dégradé de marque `linear-gradient(135deg, or → terracotta)` pour les titres héro
- micro-interactions Framer Motion partout, coins arrondis, ombres douces, glassmorphism léger (backdrop-blur) sur les barres.

## Base de données (Supabase) + RLS

Crée ces tables avec **Row Level Security activée partout (default-deny)** :

- `profiles` (id → auth.users, username unique, display_name, avatar_url, role: 'listener'|'artist'|'admin', country_code, city, preferred_language, data_saver bool)
- `artists` (id, owner_id → profiles, slug unique, name, bio, avatar_url, cover_url, country_code, city, verified bool, monthly_listeners int, status: 'draft'|'published')
- `albums` (id, artist_id, title, slug, kind, cover_url, release_date, status)
- `tracks` (id, artist_id, album_id nullable, title, slug, audio_preview_path, cover_url, duration_ms, language, mood, is_explicit, status, play_count bigint, like_count int, published_at)
- `genres` (id, slug, name, region) — seed : Rumba Congolaise, Ndombolo, Gospel, Afrobeats, Amapiano, Coupé-Décalé, Afro Pop, Hip-Hop, R&B
- `track_genres` (track_id, genre_id)
- `playlists` (id, owner_id, title, description, cover_url, is_public, is_system)
- `playlist_tracks` (playlist_id, track_id, position)
- `likes` (user_id, track_id) — trigger qui maintient tracks.like_count
- `comments` (id, track_id, user_id, body)
- `followers` (follower_id, artist_id)
- `streams` (id, track_id, user_id nullable, artist_id, country_code, city, ms_played, completed, source, created_at)
- `analytics_daily` (artist_id, track_id, day, country_code, stream_count, unique_listeners, avg_ms_played) — rollups
- `subscriptions` (user_id, tier: 'free'|'premium'|'artist_pro', status)
- `payments` (id, user_id, provider: 'mpesa'|'orange_money'|'airtel_money'|'flutterwave'|'stripe', amount_cents, currency, status)

Règles RLS : lecture publique du contenu `published` uniquement ; écriture
réservée au propriétaire (`owner_id = auth.uid()`). Fonction SQL
`SECURITY DEFINER record_stream(track_id, ms_played, completed)` qui valide le
titre, incrémente play_count et écrit l'historique — le client n'écrit jamais
directement dans `streams`. Trigger `handle_new_user` : à l'inscription, crée le
profil + un abonnement 'free'.

Buckets Storage : `avatars`, `artist-covers`, `album-covers` (publics, images
5 Mo max), `audio-preview` (public, audio 10 Mo max). Politique : un user n'écrit
que sous le préfixe `{auth.uid()}/…`.

## Pages & navigation

App shell : **sidebar** sur desktop, **bottom-nav** sur mobile. Barre supérieure
avec entrée de recherche (⌘K) et bascule de thème. Lecteur audio **persistant en
bas**, qui ne se démonte jamais lors des navigations.

1. **Accueil** — sections en carrousel horizontal : « Pour vous » (reco perso),
   « Nouveaux sons », « Tendances RDC », « Tendances Afrique », « Artistes
   populaires ». Héro avec dégradé de marque.
2. **Recherche** — artistes & titres, tolérante aux fautes (ILIKE / trigram).
3. **Découvrir** — talents à suivre, classements par pays.
4. **Bibliothèque** (auth) — titres aimés, écoutés récemment.
5. **Page artiste** — cover, avatar, auditeurs mensuels, bio, badge « **X à
   l'écoute** » en temps réel (Supabase Realtime presence sur un canal
   `artist:{id}`), grille des titres populaires.
6. **Espace artiste / Studio** (auth) — création du profil artiste, **upload de
   titres** (dialog : cover + fichier audio → Supabase Storage, lecture de la
   durée côté client, validation MIME/taille, publication immédiate), tableau de
   bord analytics (écoutes 30 j, auditeurs, likes, graphique CSS des 7 derniers
   jours, top pays, liste du catalogue).
7. **Réglages** (auth) — **mode économie de données** (switch persisté au
   profil), langue, déconnexion.
8. **Auth** — connexion / inscription email + mot de passe (Supabase Auth).

## Fonctionnalités clés (niveau world-class)

- **Lecteur** (Zustand) : file d'attente, lecture/pause, précédent/suivant,
  aléatoire, répétition (off/all/one), volume, barre de progression, comptage
  d'écoute automatique au-delà de 50 % du titre via `record_stream`. La barre du
  bas se déplie en **vue plein écran « Now Playing »** animée (grande pochette,
  fond ambiant flouté, file « à suivre »).
- **Command palette ⌘K** (cmdk) : navigation + recherche live + lecture inline.
- **Likes optimistes** : réaction instantanée, rollback en cas d'erreur, garde
  auth (invite à se connecter).
- **Toasts** animés pour le feedback.
- **PWA** : manifest, service worker (shell hors-ligne, jamais l'audio), invite
  d'installation native (`beforeinstallprompt`).
- **Recommandations v1** : fonction SQL scorée (affinité de genre depuis les
  likes + pays/langue + fraîcheur + popularité amortie par `ln`). Interface
  découplée, prête pour des embeddings plus tard.

## Afrique-first

Mode économie de données (audio basse qualité + images allégées), classements
par pays (`country_code`), mise en avant des talents locaux RDC, support des
langues fr / en / Lingala / Kiswahili, poids de bundle minimal (chargement
< 2 s sur 3G), images en WebP/AVIF avec lazy loading.

## Qualité exigée

Code production-ready, typé strictement, modulaire (un dossier par domaine :
`player`, `artists`, `playlists`, `recommendations`, `analytics`, `search`),
sans duplication ni hack. RLS sur toutes les tables, validation des uploads
(taille + type MIME), états vides et de chargement (skeletons) élégants.

Commence par : (1) créer le schéma Supabase + RLS + buckets, (2) le design
system et l'app shell, (3) le lecteur audio persistant, (4) l'accueil, puis les
autres pages module par module. Seed quelques artistes et titres de démo RDC
pour que l'accueil s'affiche avec du contenu.
