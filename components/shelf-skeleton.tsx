import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Suspense fallback matching a TrackShelf / ArtistShelf layout. */
export function ShelfSkeleton({ title, round = false }: { title: string; round?: boolean }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 font-display text-xl font-semibold tracking-tight md:text-2xl">
        {title}
      </h2>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={cn('shrink-0', round ? 'w-32 md:w-36' : 'w-40 md:w-44')}>
            <Skeleton
              className={cn('aspect-square w-full', round ? 'rounded-full' : 'rounded-lg')}
            />
            <Skeleton className="mt-2 h-4 w-3/4" />
            <Skeleton className="mt-1 h-3 w-1/2" />
          </div>
        ))}
      </div>
    </section>
  );
}
