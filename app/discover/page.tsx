import type { Metadata } from 'next';
import { Section } from '@/components/section';
import { TrackShelf } from '@/components/track-shelf';
import { ArtistShelf } from '@/components/artist-shelf';
import { toTrackCards } from '@/lib/map-tracks';
import { getNewReleases, getPopularArtists, getTrending } from '@/services/catalog';

export const metadata: Metadata = { title: 'Découvrir' };
export const dynamic = 'force-dynamic';

/** Discovery hub — leans on locale-scoped trending to surface local talent. */
export default async function DiscoverPage() {
  const [newReleases, rdc, africa, artists] = await Promise.all([
    getNewReleases(18),
    getTrending({ countryCode: 'CD', limit: 18 }),
    getTrending({ limit: 18 }),
    getPopularArtists(14),
  ]);

  return (
    <div className="mx-auto max-w-screen-2xl">
      <h1 className="mb-6 font-display text-2xl font-bold md:text-3xl">Découvrir</h1>

      <Section title="Talents à suivre">
        <ArtistShelf artists={artists} />
      </Section>
      <Section title="Nouveaux sons">
        <TrackShelf tracks={toTrackCards(newReleases)} />
      </Section>
      <Section title="Tendances RDC" subtitle="La scène congolaise en direct">
        <TrackShelf tracks={toTrackCards(rdc)} />
      </Section>
      <Section title="Tendances Afrique">
        <TrackShelf tracks={toTrackCards(africa)} />
      </Section>
    </div>
  );
}
