'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Search, Music2, Mic2, Home, Radio, Library, Loader2, Play } from 'lucide-react';
import { usePlayerStore } from '@/features/player/player-store';
import type { PlayableTrack } from '@/types/domain';
import { cn } from '@/lib/utils';

interface ArtistHit {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  verified: boolean;
}

const QUICK_LINKS = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/discover', label: 'Découvrir', icon: Radio },
  { href: '/library', label: 'Bibliothèque', icon: Library },
  { href: '/studio', label: 'Espace artiste', icon: Mic2 },
];

/**
 * Global command palette (⌘K / Ctrl+K). Fuzzy nav + live search of artists and
 * tracks, with inline play. A power-user layer most streaming apps lack.
 */
export function CommandMenu() {
  const router = useRouter();
  const playNow = usePlayerStore((s) => s.playNow);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [artists, setArtists] = useState<ArtistHit[]>([]);
  const [tracks, setTracks] = useState<PlayableTrack[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  // ⌘K / Ctrl+K toggles the palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Debounced search against the JSON endpoint.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setArtists([]);
      setTracks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { artists: ArtistHit[]; tracks: PlayableTrack[] };
        setArtists(data.artists);
        setTracks(data.tracks);
      } catch {
        // aborted or failed — ignore
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const play = useCallback(
    (track: PlayableTrack) => {
      setOpen(false);
      playNow(track, tracks);
    },
    [playNow, tracks],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center p-4 pt-[10vh]">
      <button
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Fermer"
        onClick={() => setOpen(false)}
      />
      <Command
        shouldFilter={false}
        loop
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="size-4 text-muted-foreground" />
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Rechercher ou naviguer…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground md:inline">
            ESC
          </kbd>
        </div>

        <Command.List className="scrollbar-thin max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
            {query.trim().length < 2 ? 'Tapez pour rechercher…' : 'Aucun résultat.'}
          </Command.Empty>

          {query.trim().length < 2 && (
            <Command.Group
              heading="Aller à"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {QUICK_LINKS.map((l) => (
                <Item key={l.href} onSelect={() => go(l.href)}>
                  <l.icon className="size-4 text-muted-foreground" />
                  {l.label}
                </Item>
              ))}
            </Command.Group>
          )}

          {artists.length > 0 && (
            <Command.Group
              heading="Artistes"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {artists.map((a) => (
                <Item key={a.id} onSelect={() => go(`/artist/${a.slug}`)}>
                  <Mic2 className="size-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{a.name}</span>
                </Item>
              ))}
            </Command.Group>
          )}

          {tracks.length > 0 && (
            <Command.Group
              heading="Titres"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {tracks.map((t) => (
                <Item key={t.id} onSelect={() => play(t)}>
                  <Music2 className="size-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{t.title}</span>
                  <span className="truncate text-xs text-muted-foreground">{t.artistName}</span>
                  <Play className="size-3.5 text-primary" />
                </Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </Command>
    </div>
  );
}

function Item({ children, onSelect }: { children: React.ReactNode; onSelect: () => void }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-sm outline-none',
        'data-[selected=true]:bg-secondary',
      )}
    >
      {children}
    </Command.Item>
  );
}
