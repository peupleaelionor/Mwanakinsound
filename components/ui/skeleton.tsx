import { cn } from '@/lib/utils';

/** Loading placeholder. Used with Suspense fallbacks for streaming UI. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

export { Skeleton };
