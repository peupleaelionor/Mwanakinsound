'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Play, Pause, Music2 } from 'lucide-react';
import { usePlayerStore } from '@/features/player/player-store';
import type { PlayableTrack } from '@/types/domain';
import { cn } from '@/lib/utils';

export interface TrackCardData extends PlayableTrack {
  verified?: boolean;
}

/**
 * Horizontally-scrollable row of track cards. The whole row becomes the play
 * queue when any card is played, so listeners get a natural "keep playing"
 * experience. Mobile-first: snap scrolling, no horizontal page overflow.
 */
export function TrackShelf({ tracks }: { tracks: TrackCardData[] }) {
  const currentId = usePlayerStore((s) => {
    const t = s.queue[s.currentIndex];
    return t?.id ?? null;
  });
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playNow = usePlayerStore((s) => s.playNow);
  const toggle = usePlayerStore((s) => s.toggle);

  if (tracks.length === 0) {
    return <EmptyShelf />;
  }

  return (
    <div className="scrollbar-thin -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
      {tracks.map((track) => {
        const active = currentId === track.id;
        return (
          <div key={track.id} className="group w-40 shrink-0 snap-start md:w-44">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-secondary">
              {track.coverUrl ? (
                <Image
                  src={track.coverUrl}
                  alt={track.title}
                  fill
                  sizes="(max-width: 768px) 40vw, 176px"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Music2 className="size-10" />
                </div>
              )}
              <button
                onClick={() => (active ? toggle() : playNow(track, tracks))}
                aria-label={active && isPlaying ? 'Pause' : `Lire ${track.title}`}
                className={cn(
                  'absolute bottom-2 right-2 flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all',
                  'translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100',
                  active && 'translate-y-0 opacity-100',
                )}
              >
                {active && isPlaying ? (
                  <Pause className="size-5" />
                ) : (
                  <Play className="size-5 translate-x-0.5" />
                )}
              </button>
            </div>
            <div className="mt-2">
              <p className={cn('truncate text-sm font-medium', active && 'text-primary')}>
                {track.title}
              </p>
              <Link
                href={track.linkHref ?? `/artist/${track.artistId}`}
                className="truncate text-xs text-muted-foreground hover:underline"
              >
                {track.artistName}
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyShelf() {
  return (
    <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
      Rien à afficher pour le moment — revenez bientôt.
    </div>
  );
}
