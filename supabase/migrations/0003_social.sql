-- ============================================================
-- 0003 · Social graph
-- playlists, playlist_tracks, likes, comments, followers.
-- ============================================================

-- --- playlists ----------------------------------------------------
create table public.playlists (
  id           uuid primary key default extensions.gen_random_uuid(),
  owner_id     uuid not null references public.profiles (id) on delete cascade,
  title        text not null,
  description  text,
  cover_url    text,
  is_public    boolean not null default true,
  -- true for system/AI-curated playlists (e.g. "Tendances RDC", "Mix IA").
  is_system    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_playlists_updated before update on public.playlists
  for each row execute function public.set_updated_at();

-- --- playlist_tracks (ordered) -----------------------------------
create table public.playlist_tracks (
  playlist_id  uuid not null references public.playlists (id) on delete cascade,
  track_id     uuid not null references public.tracks (id) on delete cascade,
  position     integer not null,
  added_at     timestamptz not null default now(),
  added_by     uuid references public.profiles (id) on delete set null,
  primary key (playlist_id, track_id)
);
create index idx_playlist_tracks_order on public.playlist_tracks (playlist_id, position);

-- --- likes (a user likes a track) --------------------------------
create table public.likes (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  track_id    uuid not null references public.tracks (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, track_id)
);
create index idx_likes_track on public.likes (track_id);
create index idx_likes_user_recent on public.likes (user_id, created_at desc);

-- --- comments -----------------------------------------------------
create table public.comments (
  id          uuid primary key default extensions.gen_random_uuid(),
  track_id    uuid not null references public.tracks (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  parent_id   uuid references public.comments (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_comments_updated before update on public.comments
  for each row execute function public.set_updated_at();
create index idx_comments_track on public.comments (track_id, created_at desc);

-- --- followers (user follows artist) -----------------------------
create table public.followers (
  follower_id  uuid not null references public.profiles (id) on delete cascade,
  artist_id    uuid not null references public.artists (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, artist_id)
);
create index idx_followers_artist on public.followers (artist_id);

-- --- Denormalized counter maintenance ----------------------------
-- Keep tracks.like_count in sync so discovery queries never COUNT().
create or replace function public.sync_track_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.tracks set like_count = like_count + 1 where id = new.track_id;
  elsif (tg_op = 'DELETE') then
    update public.tracks set like_count = greatest(like_count - 1, 0) where id = old.track_id;
  end if;
  return null;
end;
$$;

create trigger trg_likes_counter
  after insert or delete on public.likes
  for each row execute function public.sync_track_like_count();
