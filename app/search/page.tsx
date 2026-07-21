import type { Metadata } from 'next';
import { SearchBox } from '@/features/search/search-box';
import { Section } from '@/components/section';
import { TrackShelf } from '@/components/track-shelf';
import { ArtistShelf } from '@/components/artist-shelf';
import { toTrackCards } from '@/lib/map-tracks';
import { search } from '@/services/search';

export const metadata: Metadata = { title: 'Recherche' };
export const dynamic = 'force-dynamic';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;
  const results = q.trim().length >= 2 ? await search(q) : { tracks: [], artists: [] };
  const hasResults = results.tracks.length > 0 || results.artists.length > 0;

  return (
    <div className="mx-auto max-w-screen-2xl">
      <h1 className="mb-4 font-display text-2xl font-bold">Recherche</h1>
      <SearchBox initialQuery={q} />

      {q.trim().length >= 2 && !hasResults && (
        <p className="mt-8 text-sm text-muted-foreground">
          Aucun résultat pour « {q} ». Essayez un autre terme.
        </p>
      )}

      {results.artists.length > 0 && (
        <div className="mt-8">
          <Section title="Artistes">
            <ArtistShelf artists={results.artists} />
          </Section>
        </div>
      )}

      {results.tracks.length > 0 && (
        <div className="mt-4">
          <Section title="Titres">
            <TrackShelf tracks={toTrackCards(results.tracks)} />
          </Section>
        </div>
      )}
    </div>
  );
}
