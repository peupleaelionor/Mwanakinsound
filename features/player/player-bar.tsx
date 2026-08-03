'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import {
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
import { ChevronUp, WifiOff, Loader2 } from 'lucide-react';
import { usePlayerStore } from './player-store';
import { LikeButton } from '@/features/likes/like-button';
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
  const setExpanded = usePlayerStore((s) => s.setExpanded);

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
            {/* Now playing — tap artwork/title to open the full-screen player */}
            <div className="flex min-w-0 flex-1 items-center gap-3 md:w-64 md:flex-none">
              <button
                onClick={() => setExpanded(true)}
                aria-label="Agrandir le lecteur"
                className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-secondary"
              >
                {current.coverUrl && (
                  <Image src={current.coverUrl} alt="" fill sizes="48px" className="object-cover" />
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <ChevronUp className="size-5 text-white" />
                </span>
              </button>
              <button onClick={() => setExpanded(true)} className="min-w-0 text-left">
                <p className="truncate text-sm font-medium">{current.title}</p>
                <PlaybackStatusLine artistName={current.artistName} />
              </button>
              <LikeButton trackId={current.id} size="sm" className="hidden md:inline-flex" />
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

/**
 * Sous-titre du lecteur : nom de l'artiste en temps normal, état de la
 * connexion quand la lecture est en difficulté.
 *
 * Rassurer explicitement (« reprise automatique ») évite que l'utilisateur
 * relance manuellement et consomme de la data pour rien.
 */
function PlaybackStatusLine({ artistName }: { artistName: string }) {
  const health = usePlayerStore((s) => s.health);

  if (health === 'offline') {
    return (
      <span className="flex items-center gap-1 truncate text-xs text-destructive">
        <WifiOff className="size-3 shrink-0" /> Hors ligne — reprise automatique
      </span>
    );
  }
  if (health === 'reconnecting' || health === 'buffering') {
    return (
      <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
        <Loader2 className="size-3 shrink-0 animate-spin" />
        {health === 'reconnecting' ? 'Reconnexion…' : 'Chargement…'}
      </span>
    );
  }
  return <span className="truncate text-xs text-muted-foreground">{artistName}</span>;
}
