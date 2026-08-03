import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Mic } from 'lucide-react';
import { TrackShelf } from '@/components/track-shelf';
import { toEpisodeCards } from '@/features/podcasts/map-episode';
import { getPodcastBySlug } from '@/services/podcasts';
import type { EpisodeWithPodcast } from '@/types/domain';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const podcast = await getPodcastBySlug(slug);
  return { title: podcast?.title ?? 'Podcast' };
}

export default async function PodcastPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const podcast = await getPodcastBySlug(slug);
  if (!podcast) notFound();

  // Ré-attache la série à chaque épisode pour le mapping (lien + pochette).
  const episodes: EpisodeWithPodcast[] = podcast.episodes.map((ep) => ({
    ...ep,
    podcast: {
      id: podcast.id,
      slug: podcast.slug,
      title: podcast.title,
      cover_url: podcast.cover_url,
    },
  }));

  return (
    <div className="mx-auto max-w-screen-2xl">
      <div className="mb-6 flex flex-col items-center gap-4 text-center md:flex-row md:text-left">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-secondary">
          {podcast.cover_url ? (
            <Image
              src={podcast.cover_url}
              alt={podcast.title}
              fill
              sizes="112px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Mic className="size-10" />
            </div>
          )}
        </div>
        <div>
          {podcast.category && (
            <p className="text-sm capitalize text-primary">{podcast.category}</p>
          )}
          <h1 className="font-display text-3xl font-bold md:text-4xl">{podcast.title}</h1>
          {podcast.description && (
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{podcast.description}</p>
          )}
        </div>
      </div>

      <h2 className="mb-3 font-display text-lg font-semibold">
        {episodes.length} épisode{episodes.length > 1 ? 's' : ''}
      </h2>
      <TrackShelf tracks={toEpisodeCards(episodes)} />
    </div>
  );
}
