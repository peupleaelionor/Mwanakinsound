'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePlayerStore } from '@/features/player/player-store';
import { NAV_ITEMS } from './nav-items';
import { cn } from '@/lib/utils';

/**
 * Bottom navigation for mobile (the primary target audience).
 * Lifts above the player bar when a track is loaded.
 */
export function MobileNav() {
  const pathname = usePathname();
  const hasTrack = usePlayerStore((s) => s.currentIndex >= 0);
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <nav
      className={cn(
        'fixed inset-x-0 z-40 flex items-stretch justify-around border-t border-border bg-card/95 backdrop-blur-lg md:hidden',
        hasTrack ? 'bottom-[calc(5rem+2px)]' : 'bottom-0',
      )}
      aria-label="Navigation principale"
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'flex flex-1 flex-col items-center gap-1 py-2 text-[11px]',
            isActive(href) ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <Icon className="size-5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
