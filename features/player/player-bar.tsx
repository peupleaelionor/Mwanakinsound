'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Heart,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { usePlayerStore } from './player-store';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn, formatDuration } from '@/lib/utils';

/**
 * Persistent bottom playback bar. Reads solely from the player store; the
 * headless <AudioController> performs the actual playback. Mobile-first:
 * collapses to essentials on small screens.
 */
export function PlayerBar() {
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const current = queue[currentIndex] ?? null;

  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const repeat = usePlayerStore((s) => s.repeat);
  const shuffle = usePlayerStore((s) => s.shuffle);

  const toggle = usePlayerStore((s) => s.toggle);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const setPosition = usePlayerStore((s) => s.setPosition);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);

  return (
    <AnimatePresence>
      {current && (
        <motion.footer
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 40 }}
          className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg md:bottom-0"
          aria-label="Lecteur audio"
        >
          <div className="mx-auto flex h-20 max-w-screen-2xl items-center gap-3 px-3 md:px-4">
            {/* Now playing */}
            <div className="flex min-w-0 flex-1 items-center gap-3 md:w-64 md:flex-none">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-secondary">
                {current.coverUrl && (
                  <Image src={current.coverUrl} alt="" fill sizes="48px" className="object-cover" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{current.title}</p>
                <Link
                  href={`/artist/${current.artistId}`}
                  className="truncate text-xs text-muted-foreground hover:underline"
                >
                  {current.artistName}
                </Link>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:inline-flex"
                aria-label="Aimer"
              >
                <Heart className="size-4" />
              </Button>
            </div>

            {/* Controls + progress */}
            <div className="flex flex-1 flex-col items-center gap-1">
              <div className="flex items-center gap-1 md:gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleShuffle}
                  aria-label="Lecture aléatoire"
                  className={cn('hidden md:inline-flex', shuffle && 'text-primary')}
                >
                  <Shuffle className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={previous} aria-label="Précédent">
                  <SkipBack className="size-5" />
                </Button>
                <Button
                  size="icon"
                  onClick={toggle}
                  aria-label={isPlaying ? 'Pause' : 'Lecture'}
                  className="h-10 w-10 rounded-full"
                >
                  {isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={next} aria-label="Suivant">
                  <SkipForward className="size-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={cycleRepeat}
                  aria-label="Répéter"
                  className={cn('hidden md:inline-flex', repeat !== 'off' && 'text-primary')}
                >
                  {repeat === 'one' ? (
                    <Repeat1 className="size-4" />
                  ) : (
                    <Repeat className="size-4" />
                  )}
                </Button>
              </div>

              <div className="hidden w-full max-w-xl items-center gap-2 md:flex">
                <span className="w-10 text-right text-[11px] tabular-nums text-muted-foreground">
                  {formatDuration(positionMs)}
                </span>
                <Slider
                  value={[Math.min(positionMs, current.durationMs)]}
                  max={current.durationMs || 1}
                  step={1000}
                  onValueChange={([v]) => v != null && setPosition(v)}
                  aria-label="Progression"
                />
                <span className="w-10 text-[11px] tabular-nums text-muted-foreground">
                  {formatDuration(current.durationMs)}
                </span>
              </div>
            </div>

            {/* Volume (desktop) */}
            <div className="hidden w-40 items-center gap-2 md:flex">
              <Button variant="ghost" size="icon" onClick={toggleMute} aria-label="Volume">
                {muted || volume === 0 ? (
                  <VolumeX className="size-4" />
                ) : (
                  <Volume2 className="size-4" />
                )}
              </Button>
              <Slider
                value={[muted ? 0 : volume * 100]}
                max={100}
                step={1}
                onValueChange={([v]) => v != null && setVolume(v / 100)}
                aria-label="Volume"
              />
            </div>
          </div>

          {/* Mobile progress line */}
          <div className="h-0.5 w-full bg-muted md:hidden">
            <div
              className="h-full bg-primary transition-[width]"
              style={{
                width: `${current.durationMs ? Math.min(100, (positionMs / current.durationMs) * 100) : 0}%`,
              }}
            />
          </div>
        </motion.footer>
      )}
    </AnimatePresence>
  );
}
