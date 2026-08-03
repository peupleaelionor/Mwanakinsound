-- ============================================================================
-- 0009 · Podcasts
-- ----------------------------------------------------------------------------
-- Épisodes courts, pensés pour la 2G. Réutilise le lecteur résilient et les
-- conventions du catalogue musical (statut de publication, préfixe Storage par
-- propriétaire, RLS default-deny).
-- ============================================================================

-- --- podcasts (une série) ---------------------------------------------------
create table if not exists public.podcasts (
  id           uuid primary key default extensions.gen_random_uuid(),
  owner_id     uuid not null references public.profiles (id) on delete cascade,
  slug         text unique not null,
  title        text not null,
  description  text,
  cover_url    text,
  category     text,                       -- 'culture' | 'education' | 'actualites' | ...
  language     char(2),                    -- fr | en | ln | sw
  status       public.content_status not null default 'draft',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- --- podcast_episodes -------------------------------------------------------
create table if not exists public.podcast_episodes (
  id             uuid primary key default extensions.gen_random_uuid(),
  podcast_id     uuid not null references public.podcasts (id) on delete cascade,
  title          text not null,
  slug           text not null,
  description    text,
  -- Clé Storage (bucket podcast-audio), pas une URL complète.
  audio_path     text,
  duration_ms    integer not null default 0,
  episode_number integer,
  status         public.content_status not null default 'draft',
  play_count     bigint not null default 0,
  published_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (podcast_id, slug)
);

drop trigger if exists trg_podcasts_updated on public.podcasts;
create trigger trg_podcasts_updated before update on public.podcasts
  for each row execute function public.set_updated_at();
drop trigger if exists trg_podcast_episodes_updated on public.podcast_episodes;
create trigger trg_podcast_episodes_updated before update on public.podcast_episodes
  for each row execute function public.set_updated_at();

-- --- Indexes ---------------------------------------------------------------
create index if not exists idx_podcasts_category on public.podcasts (category)
  where status = 'published';
create index if not exists idx_podcasts_lang on public.podcasts (language)
  where status = 'published';
create index if not exists idx_episodes_podcast on public.podcast_episodes (podcast_id);
create index if not exists idx_episodes_published on public.podcast_episodes (status, published_at desc)
  where status = 'published';

-- --- RLS -------------------------------------------------------------------
alter table public.podcasts         enable row level security;
alter table public.podcast_episodes enable row level security;

drop policy if exists "published podcasts are public" on public.podcasts;
create policy "published podcasts are public"
  on public.podcasts for select
  using (status = 'published' or owner_id = auth.uid());
drop policy if exists "owners write podcasts" on public.podcasts;
create policy "owners write podcasts"
  on public.podcasts for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Un épisode est visible si sa série l'est ; il n'est modifiable que par le
-- propriétaire de la série.
drop policy if exists "published episodes are public" on public.podcast_episodes;
create policy "published episodes are public"
  on public.podcast_episodes for select
  using (
    exists (
      select 1 from public.podcasts p
      where p.id = podcast_id and (p.status = 'published' or p.owner_id = auth.uid())
    )
  );
drop policy if exists "owners write episodes" on public.podcast_episodes;
create policy "owners write episodes"
  on public.podcast_episodes for all
  using (exists (select 1 from public.podcasts p where p.id = podcast_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.podcasts p where p.id = podcast_id and p.owner_id = auth.uid()));

-- --- Storage : bucket public dédié aux épisodes ----------------------------
-- Public pour une diffusion cacheable par le CDN. Limite basse : les épisodes
-- doivent rester courts et légers (contrainte 2G).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('podcast-audio', 'podcast-audio', true, 25 * 1024 * 1024,
   array['audio/mpeg','audio/aac','audio/ogg','audio/opus','audio/webm'])
on conflict (id) do nothing;

drop policy if exists "podcast audio readable" on storage.objects;
create policy "podcast audio readable"
  on storage.objects for select using (bucket_id = 'podcast-audio');
drop policy if exists "owners upload podcast audio" on storage.objects;
create policy "owners upload podcast audio"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'podcast-audio' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "owners delete podcast audio" on storage.objects;
create policy "owners delete podcast audio"
  on storage.objects for delete to authenticated
  using (bucket_id = 'podcast-audio' and (storage.foldername(name))[1] = auth.uid()::text);

-- --- Comptage d'écoute podcast (réutilise le modèle sécurisé de record_stream)
create or replace function public.record_episode_play(p_episode_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.podcast_episodes
  set play_count = play_count + 1
  where id = p_episode_id and status = 'published';
end;
$$;

grant execute on function public.record_episode_play(uuid) to anon, authenticated;
