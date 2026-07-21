-- ============================================================
-- 0001 · Extensions & enums
-- Foundational types shared across the whole schema.
-- ============================================================

-- UUID generation, cryptographic helpers, and text search.
create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "pg_trgm" with schema extensions;
create extension if not exists "unaccent" with schema extensions;
-- Reserved for the future recommendation engine (embeddings / ANN search).
-- Enabling early keeps the migration path additive.
create extension if not exists "vector" with schema extensions;

-- --- Domain enums -------------------------------------------------
create type public.user_role as enum ('listener', 'artist', 'admin');

create type public.subscription_tier as enum ('free', 'premium', 'artist_pro');

create type public.subscription_status as enum ('active', 'trialing', 'past_due', 'canceled', 'expired');

create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'refunded');

create type public.payment_provider as enum ('mpesa', 'orange_money', 'airtel_money', 'flutterwave', 'stripe');

-- Publication lifecycle for artist-uploaded content.
create type public.content_status as enum ('draft', 'processing', 'published', 'archived', 'flagged');

create type public.album_kind as enum ('album', 'ep', 'single', 'compilation', 'mixtape');

-- Audio energy/mood buckets — populated by the AI classification layer.
create type public.audio_mood as enum (
  'energetic', 'chill', 'happy', 'melancholic', 'romantic', 'spiritual', 'dance', 'focus'
);
