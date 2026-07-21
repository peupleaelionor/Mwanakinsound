-- ============================================================
-- 0002 · Core schema
-- profiles (users), artists, genres, albums, tracks.
-- ============================================================

-- Case-insensitive text for usernames/handles. Created before first use.
create extension if not exists "citext" with schema extensions;

-- Shared trigger: keep updated_at honest on every table.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --- profiles -----------------------------------------------------
-- Public mirror of auth.users. This is the "users" table of the domain model;
-- auth.users remains the credential source of truth (managed by Supabase Auth).
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      citext unique not null,
  display_name  text not null,
  bio           text,
  avatar_url    text,
  role          public.user_role not null default 'listener',
  country_code  char(2),                      -- ISO 3166-1 alpha-2, e.g. 'CD'
  city          text,
  preferred_language char(2) not null default 'fr', -- ISO 639-1: fr, en, ln (Lingala), sw...
  data_saver    boolean not null default false, -- Africa-first: reduced-data mode
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is 'Domain user table; extends auth.users 1:1.';
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- --- genres -------------------------------------------------------
create table public.genres (
  id          uuid primary key default extensions.gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  region      text,                            -- e.g. 'RDC', 'Afrique', 'International'
  created_at  timestamptz not null default now()
);

-- --- artists ------------------------------------------------------
-- An artist is a curated identity owned by a profile (a user can run 0..1 artist).
create table public.artists (
  id            uuid primary key default extensions.gen_random_uuid(),
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  slug          text unique not null,
  name          text not null,
  bio           text,
  -- AI-generated bio kept separate so human edits are never overwritten silently.
  ai_bio        text,
  avatar_url    text,
  cover_url     text,
  country_code  char(2),
  city          text,
  verified      boolean not null default false,
  monthly_listeners integer not null default 0, -- denormalized, refreshed by job
  status        public.content_status not null default 'draft',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (owner_id) -- one artist profile per user for v1
);
create trigger trg_artists_updated before update on public.artists
  for each row execute function public.set_updated_at();

-- --- albums -------------------------------------------------------
create table public.albums (
  id            uuid primary key default extensions.gen_random_uuid(),
  artist_id     uuid not null references public.artists (id) on delete cascade,
  title         text not null,
  slug          text not null,
  kind          public.album_kind not null default 'album',
  cover_url     text,
  release_date  date,
  status        public.content_status not null default 'draft',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (artist_id, slug)
);
create trigger trg_albums_updated before update on public.albums
  for each row execute function public.set_updated_at();

-- --- tracks -------------------------------------------------------
create table public.tracks (
  id              uuid primary key default extensions.gen_random_uuid(),
  artist_id       uuid not null references public.artists (id) on delete cascade,
  album_id        uuid references public.albums (id) on delete set null,
  title           text not null,
  slug            text not null,
  -- Storage keys, not full URLs: the resolver signs/prefixes them per-CDN.
  audio_preview_path text,       -- ~30s low-bitrate clip (Supabase Storage)
  audio_master_path  text,       -- full master (Cloudflare R2)
  cover_url       text,
  duration_ms     integer not null default 0,
  track_number    integer,
  language        char(2),
  -- AI classification outputs (nullable until processed).
  mood            public.audio_mood,
  bpm             smallint,
  is_explicit     boolean not null default false,
  status          public.content_status not null default 'draft',
  -- Denormalized counters, updated transactionally / by jobs.
  play_count      bigint not null default 0,
  like_count      integer not null default 0,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (artist_id, slug)
);
create trigger trg_tracks_updated before update on public.tracks
  for each row execute function public.set_updated_at();

-- --- track ↔ genre (many-to-many) --------------------------------
create table public.track_genres (
  track_id  uuid not null references public.tracks (id) on delete cascade,
  genre_id  uuid not null references public.genres (id) on delete cascade,
  primary key (track_id, genre_id)
);

-- ================= Indexes ==================
-- Discovery & search hot paths.
create index idx_tracks_status_published on public.tracks (status, published_at desc)
  where status = 'published';
create index idx_tracks_artist on public.tracks (artist_id);
create index idx_tracks_album on public.tracks (album_id);
create index idx_tracks_mood on public.tracks (mood) where mood is not null;
-- Trending: order by plays among published tracks.
create index idx_tracks_play_count on public.tracks (play_count desc) where status = 'published';
-- Fuzzy title search (search module).
create index idx_tracks_title_trgm on public.tracks using gin (title extensions.gin_trgm_ops);

create index idx_artists_country on public.artists (country_code) where status = 'published';
create index idx_artists_listeners on public.artists (monthly_listeners desc) where status = 'published';
create index idx_artists_name_trgm on public.artists using gin (name extensions.gin_trgm_ops);

create index idx_albums_artist on public.albums (artist_id);
create index idx_track_genres_genre on public.track_genres (genre_id);
