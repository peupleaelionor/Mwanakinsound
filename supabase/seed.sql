-- ============================================================
-- Seed data — reference genres + a demo catalog.
-- Idempotent: safe to run repeatedly (ON CONFLICT guards).
-- Demo artists are owned by a placeholder profile created here so the
-- home page renders with content before any real signups.
-- ============================================================

-- --- Genres (RDC / Afrique / International) ----------------------
insert into public.genres (slug, name, region) values
  ('rumba-congolaise', 'Rumba Congolaise', 'RDC'),
  ('ndombolo',         'Ndombolo',         'RDC'),
  ('gospel-rdc',       'Gospel',           'RDC'),
  ('afrobeats',        'Afrobeats',        'Afrique'),
  ('amapiano',         'Amapiano',         'Afrique'),
  ('coupe-decale',     'Coupé-Décalé',     'Afrique'),
  ('afro-pop',         'Afro Pop',         'Afrique'),
  ('hip-hop',          'Hip-Hop',          'International'),
  ('rnb',              'R&B',              'International'),
  ('electronic',       'Électronique',     'International')
on conflict (slug) do nothing;

-- --- Demo owner profile ------------------------------------------
-- NOTE: in production, profiles are created by the auth trigger. For the demo
-- catalog we insert a standalone profile with a fixed UUID. It has no auth.users
-- row, so it cannot log in — it exists purely to own demo content.
-- We temporarily drop the FK check by inserting directly; on a real project run
-- the seed AFTER creating a matching auth user, or skip the FK by using an
-- existing user id. Here we guard so it only runs when the id is free.
do $$
declare
  demo_user uuid := '00000000-0000-0000-0000-0000000000a1';
begin
  -- Only seed demo content in non-production environments.
  if current_setting('app.environment', true) is distinct from 'production' then
    -- Insert into auth.users is not possible from SQL seed reliably; instead we
    -- allow the profile FK to be satisfied by skipping if no such user exists.
    if exists (select 1 from auth.users where id = demo_user) then
      insert into public.profiles (id, username, display_name, role, country_code, city)
      values (demo_user, 'mwanakin_demo', 'Mwanakin Demo', 'artist', 'CD', 'Kinshasa')
      on conflict (id) do nothing;
    end if;
  end if;
end $$;

-- The full demo catalog (artists/albums/tracks) is seeded via a Node script
-- that authenticates a real user first: `npm run db:seed`. See database/seed.ts.
-- This keeps the SQL seed FK-safe and production-safe.
