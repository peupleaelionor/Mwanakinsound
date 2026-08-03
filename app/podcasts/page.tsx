import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Mic } from 'lucide-react';
import { Section } from '@/components/section';
import { TrackShelf } from '@/components/track-shelf';
import { toEpisodeCards } from '@/features/podcasts/map-episode';
import { getLatestEpisodes, getPodcasts } from '@/services/podcasts';

export const metadata: Metadata = { title: 'Podcasts' };
export const dynamic = 'force-dynamic';

/**
 * Hub podcasts. Réutilise `TrackShelf` : un épisode se joue et s'affiche comme
 * un morceau. Épisodes courts = idéal 2G (contrainte n°1).
 */
export default async function PodcastsPage() {
  const [episodes, podcasts] = await Promise.all([
    getLatestEpisodes(14),
    getPodcasts({ limit: 18 }),
  ]);

  return (
    <div className="mx-auto max-w-screen-2xl">
      <h1 className="mb-6 font-display text-2xl font-bold md:text-3xl">Podcasts</h1>

      <Section title="Derniers épisodes" subtitle="Culture, éducation, actualités — format court">
        <TrackShelf tracks={toEpisodeCards(episodes)} />
      </Section>

      <Section title="Séries à suivre">
        {podcasts.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
            Aucune série pour le moment.
          </div>
        ) : (
          <div className="scrollbar-thin -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
            {podcasts.map((p) => (
              <Link
                key={p.id}
                href={`/podcasts/${p.slug}`}
                className="group w-40 shrink-0 snap-start md:w-44"
              >
                <div className="relative aspect-square overflow-hidden rounded-lg bg-secondary">
                  {p.cover_url ? (
                    <Image
                      src={p.cover_url}
                      alt={p.title}
                      fill
                      sizes="(max-width: 768px) 40vw, 176px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <Mic className="size-10" />
                    </div>
                  )}
                </div>
                <p className="mt-2 truncate text-sm font-medium">{p.title}</p>
                {p.category && (
                  <p className="truncate text-xs capitalize text-muted-foreground">{p.category}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
