-- ============================================================
-- 0006 · Business functions (RPCs)
-- Secure stream ingestion, new-user bootstrap, recommendations v1.
-- ============================================================

-- --- New auth user → profile row --------------------------------
-- Runs as the auth trigger owner. Generates a safe default username.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
-- `extensions` inclus pour résoudre le type citext de profiles.username ;
-- variables déclarées en `text` (cast implicite vers la colonne citext).
set search_path = public, extensions
as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
begin
  base_username := split_part(new.email, '@', 1);
  base_username := regexp_replace(lower(base_username), '[^a-z0-9_]', '', 'g');
  if length(base_username) < 3 then
    base_username := 'listener';
  end if;
  final_username := base_username;
  -- Resolve collisions deterministically.
  while exists (select 1 from public.profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data ->> 'display_name', base_username),
    new.raw_user_meta_data ->> 'avatar_url'
  );

  insert into public.subscriptions (user_id, tier, status)
  values (new.id, 'free', 'active');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --- Secure stream ingestion ------------------------------------
-- The only sanctioned way to record a play. Validates the track is published,
-- increments the denormalized counter, and writes history for authenticated users.
create or replace function public.record_stream(
  p_track_id uuid,
  p_ms_played integer,
  p_completed boolean default false,
  p_source text default null,
  p_country_code char(2) default null,
  p_city text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_artist_id uuid;
begin
  select artist_id into v_artist_id
  from public.tracks
  where id = p_track_id and status = 'published';

  if v_artist_id is null then
    raise exception 'track % is not playable', p_track_id using errcode = 'check_violation';
  end if;

  insert into public.streams (track_id, user_id, artist_id, ms_played, completed, source, country_code, city)
  values (p_track_id, auth.uid(), v_artist_id, greatest(p_ms_played, 0), p_completed, p_source, p_country_code, p_city);

  -- A "stream" that passed the completion threshold bumps the public counter.
  if p_completed then
    update public.tracks set play_count = play_count + 1 where id = p_track_id;
  end if;

  if auth.uid() is not null then
    insert into public.play_history (user_id, track_id) values (auth.uid(), p_track_id);
  end if;
end;
$$;

grant execute on function public.record_stream(uuid, integer, boolean, text, char, text) to anon, authenticated;

-- --- Recommendations v1 (personalized, SQL-scored) --------------
-- Deliberately explainable and cheap. The scoring blends:
--   genre affinity (from likes/history) + locale match + freshness + popularity.
-- Returns published tracks the user hasn't recently played, ranked.
-- The signature is stable so a future embeddings-based engine can replace the
-- body without breaking callers (see features/recommendations).
create or replace function public.recommend_tracks(
  p_user_id uuid default auth.uid(),
  p_limit int default 20
)
returns setof public.tracks
language sql
stable
security definer
set search_path = public
as $$
  with user_locale as (
    select country_code, preferred_language
    from public.profiles where id = p_user_id
  ),
  -- Genres the user engages with, weighted by likes.
  affinity as (
    select tg.genre_id, count(*)::numeric as weight
    from public.likes l
    join public.track_genres tg on tg.track_id = l.track_id
    where l.user_id = p_user_id
    group by tg.genre_id
  ),
  recent as (
    select track_id from public.play_history
    where user_id = p_user_id and played_at > now() - interval '3 days'
  )
  select t.*
  from public.tracks t
  left join public.track_genres tg on tg.track_id = t.id
  left join affinity a on a.genre_id = tg.genre_id
  left join user_locale ul on true
  where t.status = 'published'
    and t.id not in (select track_id from recent)
  group by t.id
  order by
      -- genre affinity (dominant signal)
      coalesce(max(a.weight), 0) * 3
      -- locale boost: same country / language surfaces local talent
    + (case when bool_or(t.language = (select preferred_language from user_locale)) then 2 else 0 end)
      -- popularity, dampened by log so hits don't crush discovery
    + ln(1 + t.play_count) * 0.5
      -- freshness: newer tracks get a gentle lift
    + (case when t.published_at > now() - interval '30 days' then 1 else 0 end)
    desc,
    t.published_at desc nulls last
  limit greatest(p_limit, 1);
$$;

grant execute on function public.recommend_tracks(uuid, int) to anon, authenticated;
