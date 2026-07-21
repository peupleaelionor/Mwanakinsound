import { Suspense } from 'react';
import { Section } from '@/components/section';
import { TrackShelf } from '@/components/track-shelf';
import { ArtistShelf } from '@/components/artist-shelf';
import { ShelfSkeleton } from '@/components/shelf-skeleton';
import { toTrackCards } from '@/lib/map-tracks';
import {
  getNewReleases,
  getPopularArtists,
  getRecommendations,
  getTrending,
} from '@/services/catalog';
import { APP_NAME } from '@/lib/constants';

// Personalized & always-fresh: render per request.
export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <div className="mx-auto max-w-screen-2xl">
      <Hero />

      <Suspense fallback={<ShelfSkeleton title="Pour vous" />}>
        <RecommendedSection />
      </Suspense>

      <Suspense fallback={<ShelfSkeleton title="Nouveaux sons" />}>
        <NewReleasesSection />
      </Suspense>

      <Suspense fallback={<ShelfSkeleton title="Tendances RDC" round />}>
        <TrendingRdcSection />
      </Suspense>

      <Suspense fallback={<ShelfSkeleton title="Tendances Afrique" />}>
        <TrendingAfricaSection />
      </Suspense>

      <Suspense fallback={<ShelfSkeleton title="Artistes populaires" round />}>
        <PopularArtistsSection />
      </Suspense>
    </div>
  );
}

function Hero() {
  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/15 via-accent/10 to-transparent p-6 md:p-10">
      <p className="mb-1 text-sm font-medium text-primary">{APP_NAME}</p>
      <h1 className="max-w-2xl font-display text-3xl font-bold leading-tight tracking-tight md:text-5xl">
        Le son du continent, <span className="text-gradient-kin">à portée du monde.</span>
      </h1>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
        Découvrez les artistes de la RDC et d&apos;Afrique, en streaming rapide et optimisé pour
        toutes les connexions.
      </p>
    </div>
  );
}

async function RecommendedSection() {
  const tracks = toTrackCards(await getRecommendations(12));
  return (
    <Section title="Pour vous" subtitle="Recommandations personnalisées">
      <TrackShelf tracks={tracks} />
    </Section>
  );
}

async function NewReleasesSection() {
  const tracks = toTrackCards(await getNewReleases(12));
  return (
    <Section title="Nouveaux sons" href="/discover">
      <TrackShelf tracks={tracks} />
    </Section>
  );
}

async function TrendingRdcSection() {
  const tracks = toTrackCards(await getTrending({ countryCode: 'CD', limit: 12 }));
  return (
    <Section title="Tendances RDC" subtitle="Ce que Kinshasa écoute">
      <TrackShelf tracks={tracks} />
    </Section>
  );
}

async function TrendingAfricaSection() {
  const tracks = toTrackCards(await getTrending({ limit: 12 }));
  return (
    <Section title="Tendances Afrique">
      <TrackShelf tracks={tracks} />
    </Section>
  );
}

async function PopularArtistsSection() {
  const artists = await getPopularArtists(10);
  return (
    <Section title="Artistes populaires" href="/discover">
      <ArtistShelf artists={artists} />
    </Section>
  );
}
