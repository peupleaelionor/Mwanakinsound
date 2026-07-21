import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, Mic2 } from 'lucide-react';
import { formatCount } from '@/lib/utils';
import type { Artist } from '@/types/database.types';

/** Row of round artist cards. Server component (no interactivity needed). */
export function ArtistShelf({ artists }: { artists: Artist[] }) {
  if (artists.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        Aucun artiste pour le moment.
      </div>
    );
  }

  return (
    <div className="scrollbar-thin -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
      {artists.map((artist) => (
        <Link
          key={artist.id}
          href={`/artist/${artist.slug}`}
          className="group w-32 shrink-0 snap-start text-center md:w-36"
        >
          <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-full bg-secondary">
            {artist.avatar_url ? (
              <Image
                src={artist.avatar_url}
                alt={artist.name}
                fill
                sizes="144px"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Mic2 className="size-8" />
              </div>
            )}
          </div>
          <div className="mt-2">
            <p className="flex items-center justify-center gap-1 truncate text-sm font-medium">
              <span className="truncate">{artist.name}</span>
              {artist.verified && <BadgeCheck className="size-3.5 shrink-0 text-primary" />}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCount(artist.monthly_listeners)} auditeurs
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
