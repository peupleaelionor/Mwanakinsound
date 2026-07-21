'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS, STUDIO_ITEM } from './nav-items';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/lib/constants';

/** Desktop navigation rail. Hidden on mobile (bottom nav takes over). */
export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-border bg-card/50 p-4 md:flex">
      <Link href="/" className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-kin font-display text-lg font-bold text-primary-foreground">
          M
        </div>
        <span className="font-display text-lg font-semibold tracking-tight">{APP_NAME}</span>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive(href)
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
            )}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto">
        <Link
          href={STUDIO_ITEM.href}
          className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <STUDIO_ITEM.icon className="size-5 text-primary" />
          {STUDIO_ITEM.label}
        </Link>
      </div>
    </aside>
  );
}
