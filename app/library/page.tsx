import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Section } from '@/components/section';
import { TrackShelf } from '@/components/track-shelf';
import { toTrackCards } from '@/lib/map-tracks';
import { createClient } from '@/lib/supabase/server';
import type { TrackWithArtist } from '@/types/domain';

export const metadata: Metadata = { title: 'Ma bibliothèque' };
export const dynamic = 'force-dynamic';

const TRACK_WITH_ARTIST = '*, artist:artists!inner(id, name, slug, verified)';

/** Signed-in listener's liked tracks & recent history. Route is auth-guarded. */
export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/library');

  const [likedRes, historyRes] = await Promise.all([
    supabase
      .from('likes')
      .select(`track:tracks(${TRACK_WITH_ARTIST})`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(24),
    supabase
      .from('play_history')
      .select(`track:tracks(${TRACK_WITH_ARTIST})`)
      .eq('user_id', user.id)
      .order('played_at', { ascending: false })
      .limit(24),
  ]);

  const liked = (likedRes.data ?? [])
    .map((r) => r.track)
    .filter(Boolean) as unknown as TrackWithArtist[];
  const history = (historyRes.data ?? [])
    .map((r) => r.track)
    .filter(Boolean) as unknown as TrackWithArtist[];

  return (
    <div className="mx-auto max-w-screen-2xl">
      <h1 className="mb-6 font-display text-2xl font-bold md:text-3xl">Ma bibliothèque</h1>
      <Section title="Titres aimés">
        <TrackShelf tracks={toTrackCards(liked)} />
      </Section>
      <Section title="Écoutés récemment">
        <TrackShelf tracks={toTrackCards(history)} />
      </Section>
    </div>
  );
}
