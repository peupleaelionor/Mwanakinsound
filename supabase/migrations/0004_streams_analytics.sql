-- ============================================================
-- 0004 · Streams, analytics, monetization
-- streams, analytics_daily, subscriptions, payments.
-- ============================================================

-- --- streams (raw play events) -----------------------------------
-- One row per meaningful play. Partition-ready: high write volume expected.
-- We keep it lean; heavy aggregation lives in analytics_daily.
create table public.streams (
  id            bigint generated always as identity primary key,
  track_id      uuid not null references public.tracks (id) on delete cascade,
  -- Nullable: anonymous listeners still count toward play totals.
  user_id       uuid references public.profiles (id) on delete set null,
  artist_id     uuid not null references public.artists (id) on delete cascade,
  -- Geo captured at play time (edge geolocation), denormalized for analytics.
  country_code  char(2),
  city          text,
  ms_played     integer not null default 0,
  completed     boolean not null default false, -- played past the "counts as a stream" threshold
  source        text,                           -- 'search' | 'playlist' | 'recommendation' | 'artist'
  created_at    timestamptz not null default now()
);
-- Analytics access patterns: by track over time, by artist over time, by geo.
create index idx_streams_track_time on public.streams (track_id, created_at desc);
create index idx_streams_artist_time on public.streams (artist_id, created_at desc);
create index idx_streams_country on public.streams (country_code, created_at desc);
create index idx_streams_user_time on public.streams (user_id, created_at desc)
  where user_id is not null;

-- --- analytics_daily (pre-aggregated rollups) --------------------
-- Refreshed by an Edge Function cron. Powers the Artist Studio dashboards
-- without ever scanning the raw streams table at request time.
create table public.analytics_daily (
  id             bigint generated always as identity primary key,
  artist_id      uuid not null references public.artists (id) on delete cascade,
  track_id       uuid references public.tracks (id) on delete cascade,
  day            date not null,
  country_code   char(2),
  stream_count   integer not null default 0,
  unique_listeners integer not null default 0,
  avg_ms_played  integer not null default 0,
  completed_count integer not null default 0
);
-- One rollup row per (artist, track, day, country). COALESCE via a unique index
-- so NULL track (artist-level) and NULL country (global) rows stay distinct.
create unique index uq_analytics_daily_grain on public.analytics_daily (
  artist_id,
  coalesce(track_id, '00000000-0000-0000-0000-000000000000'::uuid),
  day,
  coalesce(country_code, 'ZZ')
);
create index idx_analytics_artist_day on public.analytics_daily (artist_id, day desc);

-- --- subscriptions -----------------------------------------------
create table public.subscriptions (
  id            uuid primary key default extensions.gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  tier          public.subscription_tier not null default 'free',
  status        public.subscription_status not null default 'active',
  provider      public.payment_provider,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id)
);
create trigger trg_subscriptions_updated before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- --- payments ----------------------------------------------------
-- Records both subscription charges and direct artist support (tips).
create table public.payments (
  id              uuid primary key default extensions.gen_random_uuid(),
  user_id         uuid references public.profiles (id) on delete set null,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  -- For "support the artist" flows.
  beneficiary_artist_id uuid references public.artists (id) on delete set null,
  provider        public.payment_provider not null,
  provider_ref    text,                       -- external transaction id
  amount_cents    integer not null check (amount_cents >= 0),
  currency        char(3) not null default 'USD',
  status          public.payment_status not null default 'pending',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_payments_updated before update on public.payments
  for each row execute function public.set_updated_at();
create index idx_payments_user on public.payments (user_id, created_at desc);
create unique index idx_payments_provider_ref on public.payments (provider, provider_ref)
  where provider_ref is not null;

-- --- listening history --------------------------------------------
-- Distinct from streams: user-facing "recently played", deduped & capped in UI.
create table public.play_history (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  track_id    uuid not null references public.tracks (id) on delete cascade,
  played_at   timestamptz not null default now()
);
create index idx_play_history_user on public.play_history (user_id, played_at desc);
