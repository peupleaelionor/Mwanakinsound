'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Moon, Sun, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

/** Sticky top bar with search entry and theme toggle. */
export function TopBar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-lg md:px-8">
      <Link
        href="/search"
        className="flex h-9 flex-1 items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 text-sm text-muted-foreground md:max-w-sm"
      >
        <Search className="size-4" />
        Rechercher un artiste, un titre…
      </Link>
      <div className="flex-1 md:hidden" />
      <Button
        variant="ghost"
        size="icon"
        aria-label="Changer de thème"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        {mounted && theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
      </Button>
      <Button asChild size="sm" className="hidden md:inline-flex">
        <Link href="/login">Connexion</Link>
      </Button>
    </header>
  );
}
