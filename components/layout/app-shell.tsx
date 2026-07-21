import type { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { MobileNav } from './mobile-nav';
import { TopBar } from './top-bar';

/**
 * App layout frame: persistent sidebar (desktop) + top bar + scrollable main +
 * mobile bottom nav. The player bar & audio controller are mounted separately
 * in the root layout so they never unmount across navigations.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex min-h-dvh w-full flex-col">
        <TopBar />
        {/* Bottom padding leaves room for the player bar + mobile nav. */}
        <main className="scrollbar-thin flex-1 px-4 pb-40 pt-4 md:px-8 md:pb-28">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
