import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { TrackWithArtist } from '@/types/domain';
import type { Artist } from '@/types/database.types';

const TRACK_WITH_ARTIST = '*, artist:artists!inner(id, name, slug, verified)';

export interface SearchResults {
  tracks: TrackWithArtist[];
  artists: Artist[];
}

/**
 * Search across tracks & artists using trigram-backed ILIKE (see the GIN
 * indexes in migration 0002). Cheap and typo-tolerant enough for v1; a
 * dedicated full-text or vector search can slot in behind this signature later.
 */
export async function search(query: string): Promise<SearchResults> {
  const q = query.trim();
  if (q.length < 2) return { tracks: [], artists: [] };

  const supabase = await createClient();
  const pattern = `%${q}%`;

  const [tracksRes, artistsRes] = await Promise.all([
    supabase
      .from('tracks')
      .select(TRACK_WITH_ARTIST)
      .eq('status', 'published')
      .ilike('title', pattern)
      .order('play_count', { ascending: false })
      .limit(20),
    supabase
      .from('artists')
      .select('*')
      .eq('status', 'published')
      .ilike('name', pattern)
      .order('monthly_listeners', { ascending: false })
      .limit(12),
  ]);

  return {
    tracks: (tracksRes.data ?? []) as unknown as TrackWithArtist[],
    artists: artistsRes.data ?? [],
  };
}
