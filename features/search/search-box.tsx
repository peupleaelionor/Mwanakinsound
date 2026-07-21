'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

/**
 * Debounced search input that drives the URL (?q=). Keeping state in the URL
 * makes results shareable and server-rendered.
 */
export function SearchBox({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams();
      if (value.trim()) params.set('q', value.trim());
      router.replace(`/search?${params.toString()}`);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="flex h-12 items-center gap-2 rounded-full border border-border bg-secondary/50 px-4">
      <Search className="size-5 text-muted-foreground" />
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Artistes, titres, albums…"
        className="h-full flex-1 bg-transparent text-sm outline-none"
      />
    </div>
  );
}
