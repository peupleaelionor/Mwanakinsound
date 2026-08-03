'use client';

import { useState } from 'react';
import { emitEngagement } from '@mabele/core';
import { REACTION_EMOJIS } from './types';
import type { ReactionEmoji } from '@/types/database.types';
import { cn } from '@/lib/utils';

/**
 * Rangée de réactions emoji (❤️🔥🙏🎶) sur un commentaire.
 *
 * Optimiste : le compteur bouge instantanément, l'appel réseau réconcilie en
 * arrière-plan et annule en cas d'échec. Aucune réaction ne bloque l'UI.
 */
export function ReactionButton({
  commentId,
  initialCounts,
  initialMine,
}: {
  commentId: string;
  initialCounts: Record<ReactionEmoji, number>;
  initialMine: ReactionEmoji[];
}) {
  const [counts, setCounts] = useState(initialCounts);
  const [mine, setMine] = useState<Set<ReactionEmoji>>(new Set(initialMine));

  async function toggle(emoji: ReactionEmoji) {
    const wasActive = mine.has(emoji);

    // Optimiste.
    setMine((prev) => {
      const next = new Set(prev);
      if (wasActive) next.delete(emoji);
      else next.add(emoji);
      return next;
    });
    setCounts((prev) => ({ ...prev, [emoji]: Math.max(0, prev[emoji] + (wasActive ? -1 : 1)) }));

    try {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ commentId, emoji }),
      });
      if (!res.ok) throw new Error();
      if (!wasActive) emitEngagement('track.liked', commentId, { emoji });
    } catch {
      // Rollback.
      setMine((prev) => {
        const next = new Set(prev);
        if (wasActive) next.add(emoji);
        else next.delete(emoji);
        return next;
      });
      setCounts((prev) => ({ ...prev, [emoji]: Math.max(0, prev[emoji] + (wasActive ? 1 : -1)) }));
    }
  }

  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {REACTION_EMOJIS.map((emoji) => {
        const active = mine.has(emoji);
        const count = counts[emoji];
        return (
          <button
            key={emoji}
            onClick={() => toggle(emoji)}
            aria-pressed={active}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
              active
                ? 'border-primary/50 bg-primary/10 text-foreground'
                : 'border-border text-muted-foreground hover:bg-secondary',
            )}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
