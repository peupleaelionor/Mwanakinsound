-- ============================================================================
-- MWANAKIN SOUND — Backend consolidé & IDEMPOTENT (port vers kinshasa-beats)
-- ----------------------------------------------------------------------------
-- Ce fichier reproduit tout le backend (schéma + RLS + fonctions + storage) de
-- façon 100 % ré-exécutable : CREATE ... IF NOT EXISTS, enums gardés par DO,
-- CREATE OR REPLACE, DROP POLICY/TRIGGER IF EXISTS. Il peut donc être appliqué
-- sur une base Supabase déjà initialisée par Lovable SANS collision.
--
-- Application (préprod d'abord) :
--   supabase/portkit/mwanakin_backend.sql  →  Supabase Studio → SQL Editor → Run
-- ou via psql : psql "$SUPABASE_DB_URL" -f supabase/portkit/mwanakin_backend.sql
--
-- ⚠️ Si Lovable a déjà une table `profiles` PEUPLÉE avec des colonnes NOT NULL
--    différentes, relire la section « profiles » : les ADD COLUMN ont des
--    valeurs par défaut, mais un backfill manuel peut rester nécessaire.
-- ============================================================================

-- 1) EXTENSIONS ---------------------------------------------------------------
create extension if not exists "pgcrypto"  with schema extensions;
create extension if not exists "pg_trgm"   with schema extensions;
create extension if not exists "unaccent"  with schema extensions;
create extension if not exists "vector"    with schema extensions;
create extension if not exists "citext"    with schema extensions;

-- 2) ENUMS (gardés — ne recrée pas si déjà présents) --------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('listener','artist','admin'); end if;
  if not exists (select 1 from pg_type where typname = 'subscription_tier') then
    create type public.subscription_tier as enum ('free','premium','artist_pro'); end if;
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type public.subscription_status as enum ('active','trialing','past_due','canceled','expired'); end if;
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum ('pending','succeeded','failed','refunded'); end if;
  if not exists (select 1 from pg_type where typname = 'payment_provider') then
    create type public.payment_provider as enum ('mpesa','orange_money','airtel_money','flutterwave','stripe'); end if;
  if not exists (select 1 from pg_type where typname = 'content_status') then
    create type public.content_status as enum ('draft','processing','published','archived','flagged'); end if;
  if not exists (select 1 from pg_type where typname = 'album_kind') then
    create type public.album_kind as enum ('album','ep','single','compilation','mixtape'); end if;
  if not exists (select 1 from pg_type where typname = 'audio_mood') then
    create type public.audio_mood as enum ('energetic','chill','happy','melancholic','romantic','spiritual','dance','focus'); end if;
end $$;

-- 3) FONCTION updated_at ------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- 4) TABLES (create if not exists) --------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username citext unique not null,
  display_name text not null,
  bio text,
  avatar_url text,
  role public.user_role not null default 'listener',
  country_code char(2),
  city text,
  preferred_language char(2) not null default 'fr',
  data_saver boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Alignement si Lovable a déjà un `profiles` plus mince : ajoute nos colonnes.
-- username/display_name ajoutés en nullable pour ne pas échouer sur une table
-- déjà peuplée ; enforcer NOT NULL manuellement après backfill si besoin.
alter table public.profiles add column if not exists username citext;
alter table public.profiles add column if not exists display_name text;
create unique index if not exists uq_profiles_username on public.profiles (username);
alter table public.profiles add column if not exists role public.user_role not null default 'listener';
alter table public.profiles add column if not exists country_code char(2);
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists preferred_language char(2) not null default 'fr';
alter table public.profiles add column if not exists data_saver boolean not null default false;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists onboarded_at timestamptz;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.genres (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text unique not null,
  name text not null,
  region text,
  created_at timestamptz not null default now()
);

create table if not exists public.artists (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  slug text unique not null,
  name text not null,
  bio text, ai_bio text, avatar_url text, cover_url text,
  country_code char(2), city text,
  verified boolean not null default false,
  monthly_listeners integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id)
);

create table if not exists public.albums (
  id uuid primary key default extensions.gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  title text not null, slug text not null,
  kind public.album_kind not null default 'album',
  cover_url text, release_date date,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (artist_id, slug)
);

create table if not exists public.tracks (
  id uuid primary key default extensions.gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  album_id uuid references public.albums (id) on delete set null,
  title text not null, slug text not null,
  audio_preview_path text, audio_master_path text, cover_url text,
  duration_ms integer not null default 0,
  track_number integer, language char(2),
  mood public.audio_mood, bpm smallint,
  is_explicit boolean not null default false,
  status public.content_status not null default 'draft',
  play_count bigint not null default 0,
  like_count integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (artist_id, slug)
);

create table if not exists public.track_genres (
  track_id uuid not null references public.tracks (id) on delete cascade,
  genre_id uuid not null references public.genres (id) on delete cascade,
  primary key (track_id, genre_id)
);

create table if not exists public.playlists (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null, description text, cover_url text,
  is_public boolean not null default true,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.playlist_tracks (
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  position integer not null,
  added_at timestamptz not null default now(),
  added_by uuid references public.profiles (id) on delete set null,
  primary key (playlist_id, track_id)
);

create table if not exists public.likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

create table if not exists public.comments (
  id uuid primary key default extensions.gen_random_uuid(),
  track_id uuid not null references public.tracks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.followers (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  artist_id uuid not null references public.artists (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, artist_id)
);

create table if not exists public.streams (
  id bigint generated always as identity primary key,
  track_id uuid not null references public.tracks (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  artist_id uuid not null references public.artists (id) on delete cascade,
  country_code char(2), city text,
  ms_played integer not null default 0,
  completed boolean not null default false,
  source text,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_daily (
  id bigint generated always as identity primary key,
  artist_id uuid not null references public.artists (id) on delete cascade,
  track_id uuid references public.tracks (id) on delete cascade,
  day date not null, country_code char(2),
  stream_count integer not null default 0,
  unique_listeners integer not null default 0,
  avg_ms_played integer not null default 0,
  completed_count integer not null default 0
);

create table if not exists public.subscriptions (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tier public.subscription_tier not null default 'free',
  status public.subscription_status not null default 'active',
  provider public.payment_provider,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.payments (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  beneficiary_artist_id uuid references public.artists (id) on delete set null,
  provider public.payment_provider not null,
  provider_ref text,
  amount_cents integer not null check (amount_cents >= 0),
  currency char(3) not null default 'USD',
  status public.payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.play_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  played_at timestamptz not null default now()
);

-- 5) INDEXES (create if not exists) -------------------------------------------
create index if not exists idx_tracks_status_published on public.tracks (status, published_at desc) where status = 'published';
create index if not exists idx_tracks_artist on public.tracks (artist_id);
create index if not exists idx_tracks_album on public.tracks (album_id);
create index if not exists idx_tracks_mood on public.tracks (mood) where mood is not null;
create index if not exists idx_tracks_play_count on public.tracks (play_count desc) where status = 'published';
create index if not exists idx_tracks_title_trgm on public.tracks using gin (title extensions.gin_trgm_ops);
create index if not exists idx_artists_country on public.artists (country_code) where status = 'published';
create index if not exists idx_artists_listeners on public.artists (monthly_listeners desc) where status = 'published';
create index if not exists idx_artists_name_trgm on public.artists using gin (name extensions.gin_trgm_ops);
create index if not exists idx_albums_artist on public.albums (artist_id);
create index if not exists idx_track_genres_genre on public.track_genres (genre_id);
create index if not exists idx_playlist_tracks_order on public.playlist_tracks (playlist_id, position);
create index if not exists idx_likes_track on public.likes (track_id);
create index if not exists idx_likes_user_recent on public.likes (user_id, created_at desc);
create index if not exists idx_comments_track on public.comments (track_id, created_at desc);
create index if not exists idx_followers_artist on public.followers (artist_id);
create index if not exists idx_streams_track_time on public.streams (track_id, created_at desc);
create index if not exists idx_streams_artist_time on public.streams (artist_id, created_at desc);
create index if not exists idx_streams_country on public.streams (country_code, created_at desc);
create index if not exists idx_streams_user_time on public.streams (user_id, created_at desc) where user_id is not null;
create unique index if not exists uq_analytics_daily_grain on public.analytics_daily (
  artist_id, coalesce(track_id, '00000000-0000-0000-0000-000000000000'::uuid), day, coalesce(country_code, 'ZZ'));
create index if not exists idx_analytics_artist_day on public.analytics_daily (artist_id, day desc);
create index if not exists idx_payments_user on public.payments (user_id, created_at desc);
create unique index if not exists idx_payments_provider_ref on public.payments (provider, provider_ref) where provider_ref is not null;
create index if not exists idx_play_history_user on public.play_history (user_id, played_at desc);

-- 6) TRIGGERS updated_at (drop/create) ----------------------------------------
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists trg_artists_updated on public.artists;
create trigger trg_artists_updated before update on public.artists for each row execute function public.set_updated_at();
drop trigger if exists trg_albums_updated on public.albums;
create trigger trg_albums_updated before update on public.albums for each row execute function public.set_updated_at();
drop trigger if exists trg_tracks_updated on public.tracks;
create trigger trg_tracks_updated before update on public.tracks for each row execute function public.set_updated_at();
drop trigger if exists trg_playlists_updated on public.playlists;
create trigger trg_playlists_updated before update on public.playlists for each row execute function public.set_updated_at();
drop trigger if exists trg_comments_updated on public.comments;
create trigger trg_comments_updated before update on public.comments for each row execute function public.set_updated_at();
drop trigger if exists trg_subscriptions_updated on public.subscriptions;
create trigger trg_subscriptions_updated before update on public.subscriptions for each row execute function public.set_updated_at();
drop trigger if exists trg_payments_updated on public.payments;
create trigger trg_payments_updated before update on public.payments for each row execute function public.set_updated_at();

-- 7) COMPTEUR like_count (function + trigger) ---------------------------------
create or replace function public.sync_track_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    update public.tracks set like_count = like_count + 1 where id = new.track_id;
  elsif (tg_op = 'DELETE') then
    update public.tracks set like_count = greatest(like_count - 1, 0) where id = old.track_id;
  end if;
  return null;
end; $$;
drop trigger if exists trg_likes_counter on public.likes;
create trigger trg_likes_counter after insert or delete on public.likes
  for each row execute function public.sync_track_like_count();

-- 8) HELPERS RLS --------------------------------------------------------------
create or replace function public.is_artist_owner(p_artist_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.artists a where a.id = p_artist_id and a.owner_id = auth.uid());
$$;
create or replace function public.auth_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- 9) RLS : enable + policies (drop/create pour idempotence) -------------------
alter table public.profiles        enable row level security;
alter table public.artists         enable row level security;
alter table public.genres          enable row level security;
alter table public.albums          enable row level security;
alter table public.tracks          enable row level security;
alter table public.track_genres    enable row level security;
alter table public.playlists       enable row level security;
alter table public.playlist_tracks enable row level security;
alter table public.likes           enable row level security;
alter table public.comments        enable row level security;
alter table public.followers       enable row level security;
alter table public.streams         enable row level security;
alter table public.analytics_daily enable row level security;
alter table public.subscriptions   enable row level security;
alter table public.payments        enable row level security;
alter table public.play_history    enable row level security;

drop policy if exists "profiles are publicly readable" on public.profiles;
create policy "profiles are publicly readable" on public.profiles for select using (true);
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "genres readable by all" on public.genres;
create policy "genres readable by all" on public.genres for select using (true);

drop policy if exists "published artists are public" on public.artists;
create policy "published artists are public" on public.artists for select using (status = 'published' or owner_id = auth.uid());
drop policy if exists "users create their artist" on public.artists;
create policy "users create their artist" on public.artists for insert with check (owner_id = auth.uid());
drop policy if exists "owners manage their artist" on public.artists;
create policy "owners manage their artist" on public.artists for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owners delete their artist" on public.artists;
create policy "owners delete their artist" on public.artists for delete using (owner_id = auth.uid());

drop policy if exists "published albums are public" on public.albums;
create policy "published albums are public" on public.albums for select using (status = 'published' or public.is_artist_owner(artist_id));
drop policy if exists "artist owners write albums" on public.albums;
create policy "artist owners write albums" on public.albums for all using (public.is_artist_owner(artist_id)) with check (public.is_artist_owner(artist_id));

drop policy if exists "published tracks are public" on public.tracks;
create policy "published tracks are public" on public.tracks for select using (status = 'published' or public.is_artist_owner(artist_id));
drop policy if exists "artist owners write tracks" on public.tracks;
create policy "artist owners write tracks" on public.tracks for all using (public.is_artist_owner(artist_id)) with check (public.is_artist_owner(artist_id));

drop policy if exists "track genres readable" on public.track_genres;
create policy "track genres readable" on public.track_genres for select using (true);
drop policy if exists "artist owners tag their tracks" on public.track_genres;
create policy "artist owners tag their tracks" on public.track_genres for all
  using (exists (select 1 from public.tracks t where t.id = track_id and public.is_artist_owner(t.artist_id)))
  with check (exists (select 1 from public.tracks t where t.id = track_id and public.is_artist_owner(t.artist_id)));

drop policy if exists "public or own playlists readable" on public.playlists;
create policy "public or own playlists readable" on public.playlists for select using (is_public or owner_id = auth.uid());
drop policy if exists "users manage own playlists" on public.playlists;
create policy "users manage own playlists" on public.playlists for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "readable if playlist visible" on public.playlist_tracks;
create policy "readable if playlist visible" on public.playlist_tracks for select
  using (exists (select 1 from public.playlists p where p.id = playlist_id and (p.is_public or p.owner_id = auth.uid())));
drop policy if exists "owner edits playlist items" on public.playlist_tracks;
create policy "owner edits playlist items" on public.playlist_tracks for all
  using (exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = auth.uid()));

drop policy if exists "likes readable by all" on public.likes;
create policy "likes readable by all" on public.likes for select using (true);
drop policy if exists "users manage own likes" on public.likes;
create policy "users manage own likes" on public.likes for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "comments readable by all" on public.comments;
create policy "comments readable by all" on public.comments for select using (true);
drop policy if exists "users create own comments" on public.comments;
create policy "users create own comments" on public.comments for insert with check (user_id = auth.uid());
drop policy if exists "users edit own comments" on public.comments;
create policy "users edit own comments" on public.comments for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "users delete own comments" on public.comments;
create policy "users delete own comments" on public.comments for delete using (user_id = auth.uid());

drop policy if exists "follows readable by all" on public.followers;
create policy "follows readable by all" on public.followers for select using (true);
drop policy if exists "users manage own follows" on public.followers;
create policy "users manage own follows" on public.followers for all using (follower_id = auth.uid()) with check (follower_id = auth.uid());

drop policy if exists "users read own streams" on public.streams;
create policy "users read own streams" on public.streams for select using (user_id = auth.uid());

drop policy if exists "artist owners read their analytics" on public.analytics_daily;
create policy "artist owners read their analytics" on public.analytics_daily for select using (public.is_artist_owner(artist_id));

drop policy if exists "users read own subscription" on public.subscriptions;
create policy "users read own subscription" on public.subscriptions for select using (user_id = auth.uid());

drop policy if exists "users read own payments" on public.payments;
create policy "users read own payments" on public.payments for select using (user_id = auth.uid());

drop policy if exists "users read own history" on public.play_history;
create policy "users read own history" on public.play_history for select using (user_id = auth.uid());
drop policy if exists "users write own history" on public.play_history;
create policy "users write own history" on public.play_history for insert with check (user_id = auth.uid());
drop policy if exists "users clear own history" on public.play_history;
create policy "users clear own history" on public.play_history for delete using (user_id = auth.uid());

-- 10) FONCTIONS MÉTIER (RPC) --------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare base_username citext; final_username citext; suffix int := 0;
begin
  base_username := split_part(new.email, '@', 1);
  base_username := regexp_replace(lower(base_username), '[^a-z0-9_]', '', 'g');
  if length(base_username) < 3 then base_username := 'listener'; end if;
  final_username := base_username;
  while exists (select 1 from public.profiles where username = final_username) loop
    suffix := suffix + 1; final_username := base_username || suffix::text;
  end loop;
  insert into public.profiles (id, username, display_name, avatar_url)
  values (new.id, final_username,
          coalesce(new.raw_user_meta_data ->> 'display_name', base_username::text),
          new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;
  insert into public.subscriptions (user_id, tier, status)
  values (new.id, 'free', 'active') on conflict (user_id) do nothing;
  return new;
end; $$;

-- ⚠️ On supprime tout trigger d'auth existant (le nôtre OU celui de Lovable
--    s'il porte ce nom) avant de recréer, pour n'en garder qu'UN seul.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.record_stream(
  p_track_id uuid, p_ms_played integer, p_completed boolean default false,
  p_source text default null, p_country_code char(2) default null, p_city text default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_artist_id uuid;
begin
  select artist_id into v_artist_id from public.tracks where id = p_track_id and status = 'published';
  if v_artist_id is null then
    raise exception 'track % is not playable', p_track_id using errcode = 'check_violation';
  end if;
  insert into public.streams (track_id, user_id, artist_id, ms_played, completed, source, country_code, city)
  values (p_track_id, auth.uid(), v_artist_id, greatest(p_ms_played, 0), p_completed, p_source, p_country_code, p_city);
  if p_completed then update public.tracks set play_count = play_count + 1 where id = p_track_id; end if;
  if auth.uid() is not null then insert into public.play_history (user_id, track_id) values (auth.uid(), p_track_id); end if;
end; $$;
grant execute on function public.record_stream(uuid, integer, boolean, text, char, text) to anon, authenticated;

create or replace function public.recommend_tracks(p_user_id uuid default auth.uid(), p_limit int default 20)
returns setof public.tracks language sql stable security definer set search_path = public as $$
  with user_locale as (select country_code, preferred_language from public.profiles where id = p_user_id),
  affinity as (
    select tg.genre_id, count(*)::numeric as weight
    from public.likes l join public.track_genres tg on tg.track_id = l.track_id
    where l.user_id = p_user_id group by tg.genre_id),
  recent as (select track_id from public.play_history where user_id = p_user_id and played_at > now() - interval '3 days')
  select t.* from public.tracks t
  left join public.track_genres tg on tg.track_id = t.id
  left join affinity a on a.genre_id = tg.genre_id
  where t.status = 'published' and t.id not in (select track_id from recent)
  group by t.id
  order by coalesce(max(a.weight), 0) * 3
    + (case when bool_or(t.language = (select preferred_language from user_locale)) then 2 else 0 end)
    + ln(1 + t.play_count) * 0.5
    + (case when t.published_at > now() - interval '30 days' then 1 else 0 end) desc,
    t.published_at desc nulls last
  limit greatest(p_limit, 1);
$$;
grant execute on function public.recommend_tracks(uuid, int) to anon, authenticated;

-- 11) STORAGE : buckets + policies -------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars','avatars',true,2*1024*1024,array['image/jpeg','image/png','image/webp']),
  ('artist-covers','artist-covers',true,5*1024*1024,array['image/jpeg','image/png','image/webp']),
  ('album-covers','album-covers',true,5*1024*1024,array['image/jpeg','image/png','image/webp']),
  ('audio-preview','audio-preview',true,10*1024*1024,array['audio/mpeg','audio/aac','audio/ogg']),
  ('audio-master','audio-master',false,50*1024*1024,array['audio/mpeg','audio/aac','audio/flac','audio/wav'])
on conflict (id) do nothing;

drop policy if exists "public images are readable" on storage.objects;
create policy "public images are readable" on storage.objects for select
  using (bucket_id in ('avatars','artist-covers','album-covers','audio-preview'));
drop policy if exists "users upload to own image folder" on storage.objects;
create policy "users upload to own image folder" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars','artist-covers','album-covers','audio-preview') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "users update own images" on storage.objects;
create policy "users update own images" on storage.objects for update to authenticated
  using (bucket_id in ('avatars','artist-covers','album-covers','audio-preview') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "users delete own images" on storage.objects;
create policy "users delete own images" on storage.objects for delete to authenticated
  using (bucket_id in ('avatars','artist-covers','album-covers','audio-preview') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "owners read own masters" on storage.objects;
create policy "owners read own masters" on storage.objects for select to authenticated
  using (bucket_id = 'audio-master' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "owners upload own masters" on storage.objects;
create policy "owners upload own masters" on storage.objects for insert to authenticated
  with check (bucket_id = 'audio-master' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "owners delete own masters" on storage.objects;
create policy "owners delete own masters" on storage.objects for delete to authenticated
  using (bucket_id = 'audio-master' and (storage.foldername(name))[1] = auth.uid()::text);

-- 12) SEED genres de référence (idempotent) ----------------------------------
insert into public.genres (slug, name, region) values
  ('rumba-congolaise','Rumba Congolaise','RDC'),
  ('ndombolo','Ndombolo','RDC'),
  ('gospel-rdc','Gospel','RDC'),
  ('afrobeats','Afrobeats','Afrique'),
  ('amapiano','Amapiano','Afrique'),
  ('coupe-decale','Coupé-Décalé','Afrique'),
  ('afro-pop','Afro Pop','Afrique'),
  ('hip-hop','Hip-Hop','International'),
  ('rnb','R&B','International'),
  ('electronic','Électronique','International')
on conflict (slug) do nothing;

-- ============================================================================
-- FIN. Ré-exécutable sans erreur. Après application :
--   supabase gen types typescript --linked > src/types/database.types.ts
-- Puis brancher l'UI sur les RPC record_stream / recommend_tracks.
-- ============================================================================
