-- ============================================================================
-- 0010 · Réseau social minimaliste (podcasts & épisodes)
-- ----------------------------------------------------------------------------
-- Commentaires (<=280, hashtags), réactions emoji, partages.
-- Distinct de `public.comments` (0003), reservé aux morceaux : ici le social
-- porte sur podcasts et épisodes.
-- ============================================================================

-- --- Extraction de hashtags (regex, pas de dépendance externe) --------------
-- spaCy est volontairement écarté (Python + poids, cf. docs/STACK_DECISIONS).
-- Une regex couvre parfaitement #motclef pour un réseau social minimaliste.
create or replace function public.extract_hashtags(p_text text)
returns text[]
language sql
immutable
as $$
  select coalesce(array_agg(distinct lower(m[1])), '{}')
  from regexp_matches(coalesce(p_text, ''), '#([A-Za-z0-9_]{1,50})', 'g') as m;
$$;

-- --- Commentaires -----------------------------------------------------------
create table if not exists public.social_comments (
  id          uuid primary key default extensions.gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  podcast_id  uuid references public.podcasts (id) on delete cascade,
  episode_id  uuid references public.podcast_episodes (id) on delete cascade,
  content     text not null check (char_length(content) between 1 and 280),
  hashtags    text[] not null default '{}',
  created_at  timestamptz not null default now(),
  -- Un commentaire porte sur exactement une cible : podcast OU épisode.
  constraint one_target check (
    (podcast_id is not null)::int + (episode_id is not null)::int = 1
  )
);

create index if not exists idx_scomments_episode on public.social_comments (episode_id, created_at desc)
  where episode_id is not null;
create index if not exists idx_scomments_podcast on public.social_comments (podcast_id, created_at desc)
  where podcast_id is not null;
create index if not exists idx_scomments_hashtags on public.social_comments using gin (hashtags);
create index if not exists idx_scomments_user on public.social_comments (user_id);

-- Hashtags dérivés du contenu à chaque écriture : jamais désynchronisés.
create or replace function public.sync_comment_hashtags()
returns trigger language plpgsql as $$
begin
  new.hashtags := public.extract_hashtags(new.content);
  return new;
end; $$;
drop trigger if exists trg_scomments_hashtags on public.social_comments;
create trigger trg_scomments_hashtags
  before insert or update of content on public.social_comments
  for each row execute function public.sync_comment_hashtags();

-- --- Réactions (emoji sur commentaire) --------------------------------------
create table if not exists public.comment_reactions (
  id          uuid primary key default extensions.gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  comment_id  uuid not null references public.social_comments (id) on delete cascade,
  emoji       text not null check (emoji in ('❤️','🔥','🙏','🎶')),
  created_at  timestamptz not null default now(),
  -- Une réaction par (utilisateur, commentaire, emoji).
  unique (user_id, comment_id, emoji)
);
create index if not exists idx_reactions_comment on public.comment_reactions (comment_id);

-- --- Partages ---------------------------------------------------------------
create table if not exists public.social_shares (
  id          uuid primary key default extensions.gen_random_uuid(),
  user_id     uuid references public.profiles (id) on delete set null,
  podcast_id  uuid references public.podcasts (id) on delete cascade,
  episode_id  uuid references public.podcast_episodes (id) on delete cascade,
  share_link  text not null,
  created_at  timestamptz not null default now(),
  constraint one_share_target check (
    (podcast_id is not null)::int + (episode_id is not null)::int = 1
  )
);
create index if not exists idx_shares_episode on public.social_shares (episode_id) where episode_id is not null;
create index if not exists idx_shares_podcast on public.social_shares (podcast_id) where podcast_id is not null;

-- --- RLS --------------------------------------------------------------------
alter table public.social_comments   enable row level security;
alter table public.comment_reactions enable row level security;
alter table public.social_shares     enable row level security;

-- Contenu social public en lecture (fil de commentaires visible par tous).
drop policy if exists "social comments readable" on public.social_comments;
create policy "social comments readable" on public.social_comments for select using (true);
drop policy if exists "users create own comments" on public.social_comments;
create policy "users create own comments" on public.social_comments for insert
  with check (user_id = auth.uid());
drop policy if exists "users edit own comments" on public.social_comments;
create policy "users edit own comments" on public.social_comments for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "users delete own comments" on public.social_comments;
create policy "users delete own comments" on public.social_comments for delete
  using (user_id = auth.uid());

drop policy if exists "reactions readable" on public.comment_reactions;
create policy "reactions readable" on public.comment_reactions for select using (true);
drop policy if exists "users manage own reactions" on public.comment_reactions;
create policy "users manage own reactions" on public.comment_reactions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "shares readable" on public.social_shares;
create policy "shares readable" on public.social_shares for select using (true);
drop policy if exists "users create own shares" on public.social_shares;
create policy "users create own shares" on public.social_shares for insert
  with check (user_id = auth.uid());

-- --- Statistiques d'engagement (pour les badges, calculés côté app) ---------
create or replace function public.social_user_stats(p_user uuid)
returns table (comment_count bigint, reaction_given bigint, prayer_reactions bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.social_comments where user_id = p_user),
    (select count(*) from public.comment_reactions where user_id = p_user),
    (select count(*) from public.comment_reactions where user_id = p_user and emoji = '🙏');
$$;
grant execute on function public.social_user_stats(uuid) to anon, authenticated;
