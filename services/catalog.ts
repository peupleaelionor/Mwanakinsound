import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { SqlRecommendationEngine } from '@/features/recommendations/engine';
import type { TrackWithArtist } from '@/types/domain';
import type { Artist } from '@/types/database.types';

/**
 * Server-side catalog data access. Thin, typed wrappers around Supabase used by
 * Server Components. All queries hit RLS-protected views, so they're safe to
 * call with the request-scoped anon client.
 */

const TRACK_WITH_ARTIST = '*, artist:artists!inner(id, name, slug, verified)';

/** Newest published tracks — "Nouveaux sons". */
export async function getNewReleases(limit = 12): Promise<TrackWithArtist[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tracks')
    .select(TRACK_WITH_ARTIST)
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data ?? []) as unknown as TrackWithArtist[];
}

/** Most played tracks, optionally scoped to a country — "Tendances". */
export async function getTrending(
  opts: { countryCode?: string; limit?: number } = {},
): Promise<TrackWithArtist[]> {
  const { countryCode, limit = 12 } = opts;
  const supabase = await createClient();
  let query = supabase
    .from('tracks')
    .select(TRACK_WITH_ARTIST)
    .eq('status', 'published')
    .order('play_count', { ascending: false })
    .limit(limit);
  if (countryCode) {
    query = query.eq('artist.country_code', countryCode);
  }
  const { data } = await query;
  return (data ?? []) as unknown as TrackWithArtist[];
}

/** Popular artists by monthly listeners — "Artistes populaires". */
export async function getPopularArtists(limit = 10): Promise<Artist[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('artists')
    .select('*')
    .eq('status', 'published')
    .order('monthly_listeners', { ascending: false })
    .limit(limit);
  return data ?? [];
}

/**
 * Personalized recommendations for the signed-in user, hydrated with artist
 * info for display. Falls back to trending when the engine returns nothing
 * (anonymous users, cold start).
 */
export async function getRecommendations(limit = 12): Promise<TrackWithArtist[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const engine = new SqlRecommendationEngine(supabase);
  const recommended = await engine.forUser(user?.id ?? null, limit);

  if (recommended.length === 0) {
    return getTrending({ limit });
  }

  // Hydrate artist for the recommended ids, preserving the engine's ranking.
  const ids = recommended.map((t) => t.id);
  const { data } = await supabase.from('tracks').select(TRACK_WITH_ARTIST).in('id', ids);
  const byId = new Map((data ?? []).map((t) => [(t as unknown as TrackWithArtist).id, t]));
  return ids
    .map((id) => byId.get(id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t)) as unknown as TrackWithArtist[];
}
