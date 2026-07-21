'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Moon, Sun, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

/** Opens the global ⌘K command palette by dispatching the shortcut. */
function openCommandMenu() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
}

/** Sticky top bar with command-palette entry and theme toggle. */
export function TopBar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-lg md:px-8">
      <button
        onClick={openCommandMenu}
        className="flex h-9 flex-1 items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 text-sm text-muted-foreground transition-colors hover:bg-secondary md:max-w-sm"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Rechercher un artiste, un titre…</span>
        <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] md:inline">
          ⌘K
        </kbd>
      </button>
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
