-- ============================================================
-- 0005 · Row Level Security
-- Default-deny everywhere; explicit, least-privilege policies.
-- ============================================================

-- Helper: is the current user the owner of a given artist?
create or replace function public.is_artist_owner(p_artist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.artists a
    where a.id = p_artist_id and a.owner_id = auth.uid()
  );
$$;

-- Helper: current user's role (avoid the reserved `current_role` keyword).
create or replace function public.auth_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Enable RLS on every table.
alter table public.profiles         enable row level security;
alter table public.artists          enable row level security;
alter table public.genres           enable row level security;
alter table public.albums           enable row level security;
alter table public.tracks           enable row level security;
alter table public.track_genres     enable row level security;
alter table public.playlists        enable row level security;
alter table public.playlist_tracks  enable row level security;
alter table public.likes            enable row level security;
alter table public.comments         enable row level security;
alter table public.followers        enable row level security;
alter table public.streams          enable row level security;
alter table public.analytics_daily  enable row level security;
alter table public.subscriptions    enable row level security;
alter table public.payments         enable row level security;
alter table public.play_history     enable row level security;

-- ---------- profiles ----------
create policy "profiles are publicly readable"
  on public.profiles for select using (true);
create policy "users update own profile"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "users insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- ---------- genres (reference data) ----------
create policy "genres readable by all"
  on public.genres for select using (true);

-- ---------- artists ----------
create policy "published artists are public"
  on public.artists for select
  using (status = 'published' or owner_id = auth.uid());
create policy "users create their artist"
  on public.artists for insert with check (owner_id = auth.uid());
create policy "owners manage their artist"
  on public.artists for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners delete their artist"
  on public.artists for delete using (owner_id = auth.uid());

-- ---------- albums ----------
create policy "published albums are public"
  on public.albums for select
  using (status = 'published' or public.is_artist_owner(artist_id));
create policy "artist owners write albums"
  on public.albums for all
  using (public.is_artist_owner(artist_id))
  with check (public.is_artist_owner(artist_id));

-- ---------- tracks ----------
create policy "published tracks are public"
  on public.tracks for select
  using (status = 'published' or public.is_artist_owner(artist_id));
create policy "artist owners write tracks"
  on public.tracks for all
  using (public.is_artist_owner(artist_id))
  with check (public.is_artist_owner(artist_id));

-- ---------- track_genres ----------
create policy "track genres readable"
  on public.track_genres for select using (true);
create policy "artist owners tag their tracks"
  on public.track_genres for all
  using (exists (select 1 from public.tracks t where t.id = track_id and public.is_artist_owner(t.artist_id)))
  with check (exists (select 1 from public.tracks t where t.id = track_id and public.is_artist_owner(t.artist_id)));

-- ---------- playlists ----------
create policy "public or own playlists readable"
  on public.playlists for select
  using (is_public or owner_id = auth.uid());
create policy "users manage own playlists"
  on public.playlists for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------- playlist_tracks ----------
create policy "readable if playlist visible"
  on public.playlist_tracks for select
  using (exists (
    select 1 from public.playlists p
    where p.id = playlist_id and (p.is_public or p.owner_id = auth.uid())
  ));
create policy "owner edits playlist items"
  on public.playlist_tracks for all
  using (exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = auth.uid()));

-- ---------- likes ----------
create policy "likes readable by all"
  on public.likes for select using (true);
create policy "users manage own likes"
  on public.likes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- comments ----------
create policy "comments readable by all"
  on public.comments for select using (true);
create policy "users create own comments"
  on public.comments for insert with check (user_id = auth.uid());
create policy "users edit own comments"
  on public.comments for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users delete own comments"
  on public.comments for delete using (user_id = auth.uid());

-- ---------- followers ----------
create policy "follows readable by all"
  on public.followers for select using (true);
create policy "users manage own follows"
  on public.followers for all
  using (follower_id = auth.uid()) with check (follower_id = auth.uid());

-- ---------- streams ----------
-- Inserts happen through a SECURITY DEFINER RPC (see 0006) so the client never
-- writes arbitrary rows. Direct client reads are denied; artists read via
-- analytics_daily. We still allow a user to read their own stream rows.
create policy "users read own streams"
  on public.streams for select using (user_id = auth.uid());

-- ---------- analytics_daily ----------
create policy "artist owners read their analytics"
  on public.analytics_daily for select
  using (public.is_artist_owner(artist_id));

-- ---------- subscriptions ----------
create policy "users read own subscription"
  on public.subscriptions for select using (user_id = auth.uid());
-- Writes are performed by the billing Edge Function (service role), never the client.

-- ---------- payments ----------
create policy "users read own payments"
  on public.payments for select using (user_id = auth.uid());
-- Writes are performed by the billing Edge Function (service role) only.

-- ---------- play_history ----------
create policy "users read own history"
  on public.play_history for select using (user_id = auth.uid());
create policy "users write own history"
  on public.play_history for insert with check (user_id = auth.uid());
create policy "users clear own history"
  on public.play_history for delete using (user_id = auth.uid());
