import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Mic } from 'lucide-react';
import { getEpisodeById } from '@/services/podcasts';
import { episodeToPlayable } from '@/features/podcasts/map-episode';
import { PlayEpisodeButton } from '@/features/podcasts/play-episode-button';
import { CommentSection } from '@/features/social/comment-section';
import { ShareModal } from '@/features/social/share-modal';
import { formatDuration } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const episode = await getEpisodeById(id);
  return { title: episode?.title ?? 'Épisode' };
}

export default async function EpisodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const episode = await getEpisodeById(id);
  if (!episode) notFound();

  const playable = episodeToPlayable(episode);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-secondary">
          {episode.podcast.cover_url ? (
            <Image
              src={episode.podcast.cover_url}
              alt={episode.podcast.title}
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Mic className="size-8" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <Link
            href={`/podcasts/${episode.podcast.slug}`}
            className="text-sm text-primary hover:underline"
          >
            {episode.podcast.title}
          </Link>
          <h1 className="font-display text-2xl font-bold">{episode.title}</h1>
          <p className="text-sm text-muted-foreground">{formatDuration(episode.duration_ms)}</p>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-2">
        {playable && <PlayEpisodeButton track={playable} />}
        <ShareModal
          episodeId={episode.id}
          slug={episode.podcast.slug}
          title={episode.title}
          subtitle={episode.podcast.title}
        />
      </div>

      {episode.description && (
        <p className="mb-6 whitespace-pre-wrap text-sm text-muted-foreground">
          {episode.description}
        </p>
      )}

      <CommentSection target={{ episodeId: episode.id }} />
    </div>
  );
}
