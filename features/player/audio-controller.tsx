'use client';

import { useEffect, useRef } from 'react';
import { usePlayerStore } from './player-store';
import { recordStream } from './record-stream';
import { STREAM_COMPLETION_RATIO } from '@/lib/constants';

/**
 * Single, app-wide <audio> element driven by the player store.
 * Kept headless (renders nothing) and mounted once in the root layout so
 * playback survives navigation. This is the only place that touches the
 * HTMLAudioElement — the rest of the app talks to the store.
 */
export function AudioController() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamReportedRef = useRef<string | null>(null);

  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const queue = usePlayerStore((s) => s.queue);
  const current = queue[currentIndex] ?? null;

  // Load a new source when the current track changes.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.src !== current.audioUrl) {
      audio.src = current.audioUrl;
      audio.load();
      streamReportedRef.current = null;
    }
  }, [current]);

  // Reflect play/pause intent.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (isPlaying) {
      audio.play().catch(() => usePlayerStore.getState().setPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying, current]);

  // Volume / mute.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = muted;
  }, [volume, muted]);

  return (
    <audio
      ref={audioRef}
      preload="metadata"
      onTimeUpdate={(e) => {
        const el = e.currentTarget;
        const ms = el.currentTime * 1000;
        usePlayerStore.getState().setPosition(ms);
        // Count a stream once the completion threshold is crossed (once per track).
        if (
          current &&
          streamReportedRef.current !== current.id &&
          current.durationMs > 0 &&
          ms / current.durationMs >= STREAM_COMPLETION_RATIO
        ) {
          streamReportedRef.current = current.id;
          void recordStream({ trackId: current.id, msPlayed: Math.floor(ms), completed: true });
        }
      }}
      onEnded={() => {
        const { current: cur } = usePlayerStore.getState();
        const track = cur();
        if (track && streamReportedRef.current !== track.id) {
          void recordStream({ trackId: track.id, msPlayed: track.durationMs, completed: true });
        }
        usePlayerStore.getState().next();
      }}
    />
  );
}
