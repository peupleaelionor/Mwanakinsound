'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  Music2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { usePlayerStore } from './player-store';
import { LikeButton } from '@/features/likes/like-button';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn, formatDuration } from '@/lib/utils';

/**
 * Immersive full-screen "Now Playing" view — large artwork, queue, full
 * controls. Slides up from the player bar. A tier of polish beyond the standard
 * mini-player most web apps ship.
 */
export function NowPlaying() {
  const expanded = usePlayerStore((s) => s.expanded);
  const setExpanded = usePlayerStore((s) => s.setExpanded);
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const current = queue[currentIndex] ?? null;

  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const repeat = usePlayerStore((s) => s.repeat);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const toggle = usePlayerStore((s) => s.toggle);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const setPosition = usePlayerStore((s) => s.setPosition);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const setQueueIndex = usePlayerStore((s) => s.playNow);

  const upNext = queue.slice(currentIndex + 1);

  return (
    <AnimatePresence>
      {expanded && current && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          className="fixed inset-0 z-[70] flex flex-col bg-background"
        >
          {/* Ambient backdrop from cover */}
          {current.coverUrl && (
            <div className="pointer-events-none absolute inset-0 -z-10 opacity-30">
              <Image
                src={current.coverUrl}
                alt=""
                fill
                className="scale-110 object-cover blur-3xl"
              />
              <div className="absolute inset-0 bg-background/60" />
            </div>
          )}

          <header className="flex items-center justify-between p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(false)}
              aria-label="Réduire"
            >
              <ChevronDown className="size-6" />
            </Button>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              En lecture
            </span>
            <div className="size-10" />
          </header>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-6">
            <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-secondary shadow-2xl">
              {current.coverUrl ? (
                <Image
                  src={current.coverUrl}
                  alt={current.title}
                  fill
                  sizes="384px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Music2 className="size-20" />
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate font-display text-2xl font-bold">{current.title}</h2>
                <Link
                  href={current.linkHref ?? `/artist/${current.artistId}`}
                  onClick={() => setExpanded(false)}
                  className="truncate text-muted-foreground hover:underline"
                >
                  {current.artistName}
                </Link>
              </div>
              <LikeButton trackId={current.id} />
            </div>

            <div className="mt-4">
              <Slider
                value={[Math.min(positionMs, current.durationMs)]}
                max={current.durationMs || 1}
                step={1000}
                onValueChange={([v]) => v != null && setPosition(v)}
                aria-label="Progression"
              />
              <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted-foreground">
                <span>{formatDuration(positionMs)}</span>
                <span>{formatDuration(current.durationMs)}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleShuffle}
                className={cn(shuffle && 'text-primary')}
                aria-label="Aléatoire"
              >
                <Shuffle className="size-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={previous} aria-label="Précédent">
                <SkipBack className="size-7" />
              </Button>
              <Button
                size="icon"
                onClick={toggle}
                className="size-16 rounded-full"
                aria-label={isPlaying ? 'Pause' : 'Lecture'}
              >
                {isPlaying ? (
                  <Pause className="size-7" />
                ) : (
                  <Play className="size-7 translate-x-0.5" />
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={next} aria-label="Suivant">
                <SkipForward className="size-7" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={cycleRepeat}
                className={cn(repeat !== 'off' && 'text-primary')}
                aria-label="Répéter"
              >
                {repeat === 'one' ? <Repeat1 className="size-5" /> : <Repeat className="size-5" />}
              </Button>
            </div>

            {upNext.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  À suivre
                </p>
                <div className="scrollbar-thin max-h-40 space-y-1 overflow-y-auto">
                  {upNext.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setQueueIndex(t, queue)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-secondary"
                    >
                      <div className="relative size-9 shrink-0 overflow-hidden rounded bg-secondary">
                        {t.coverUrl && (
                          <Image
                            src={t.coverUrl}
                            alt=""
                            fill
                            sizes="36px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm">{t.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{t.artistName}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
