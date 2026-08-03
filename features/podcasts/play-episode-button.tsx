'use client';

import { Play, Pause } from 'lucide-react';
import { usePlayerStore } from '@/features/player/player-store';
import { Button } from '@/components/ui/button';
import type { PlayableTrack } from '@/types/domain';

/** Lance (ou met en pause) un épisode dans le lecteur global. */
export function PlayEpisodeButton({ track }: { track: PlayableTrack }) {
  const currentId = usePlayerStore((s) => s.queue[s.currentIndex]?.id ?? null);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playNow = usePlayerStore((s) => s.playNow);
  const toggle = usePlayerStore((s) => s.toggle);

  const active = currentId === track.id;

  return (
    <Button onClick={() => (active ? toggle() : playNow(track, [track]))}>
      {active && isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
      {active && isPlaying ? 'Pause' : 'Écouter'}
    </Button>
  );
}
