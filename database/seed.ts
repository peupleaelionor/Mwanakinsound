/**
 * Demo catalog seeder.
 *
 * Populates a small, realistic catalog (artists + tracks) so the home page has
 * content in development. Runs against a real Supabase project using the
 * SERVICE ROLE key (bypasses RLS) — NEVER ship this key to the client.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx database/seed.ts
 *
 * Idempotent: upserts on natural keys (artist/track slug).
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false },
});

// A demo owner profile id. Create a matching auth user first, or reuse an
// existing user's id via DEMO_OWNER_ID.
const OWNER_ID = process.env.DEMO_OWNER_ID;

const artists = [
  {
    slug: 'kin-rumba',
    name: 'Kin Rumba',
    city: 'Kinshasa',
    country: 'CD',
    genres: ['rumba-congolaise'],
  },
  {
    slug: 'ndombolo-star',
    name: 'Ndombolo Star',
    city: 'Lubumbashi',
    country: 'CD',
    genres: ['ndombolo'],
  },
  {
    slug: 'afro-kin',
    name: 'Afro Kin',
    city: 'Goma',
    country: 'CD',
    genres: ['afrobeats', 'afro-pop'],
  },
];

async function main() {
  if (!OWNER_ID) {
    console.error(
      'Set DEMO_OWNER_ID to an existing auth user id (the demo artists need an owner).',
    );
    process.exit(1);
  }

  for (const a of artists) {
    const { data: artist, error } = await supabase
      .from('artists')
      .upsert(
        {
          owner_id: OWNER_ID,
          slug: a.slug,
          name: a.name,
          city: a.city,
          country_code: a.country,
          status: 'published',
          verified: true,
          monthly_listeners: Math.floor(Math.random() * 500_000),
        },
        { onConflict: 'slug' },
      )
      .select('id')
      .single();

    if (error || !artist) {
      console.error(`Artist ${a.slug} failed:`, error?.message);
      continue;
    }

    for (let i = 1; i <= 4; i++) {
      await supabase.from('tracks').upsert(
        {
          artist_id: artist.id,
          slug: `${a.slug}-titre-${i}`,
          title: `${a.name} — Titre ${i}`,
          status: 'published',
          duration_ms: 180_000 + i * 15_000,
          play_count: Math.floor(Math.random() * 200_000),
          published_at: new Date().toISOString(),
        },
        { onConflict: 'artist_id,slug' },
      );
    }
    console.log(`Seeded ${a.name} + 4 tracks`);
  }

  console.log('Demo seed complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
