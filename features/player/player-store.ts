'use client';

import { create } from 'zustand';
import type { PlayableTrack } from '@/types/domain';
import type { PlaybackHealth } from './resilient-audio';

type RepeatMode = 'off' | 'all' | 'one';

interface PlayerState {
  queue: PlayableTrack[];
  /** Index into `queue` of the current track, or -1 when nothing is loaded. */
  currentIndex: number;
  isPlaying: boolean;
  /** 0..1 */
  volume: number;
  muted: boolean;
  repeat: RepeatMode;
  shuffle: boolean;
  /** Live playback position in ms, mirrored from the audio element. */
  positionMs: number;
  /** Full-screen "Now Playing" view visibility. */
  expanded: boolean;
  /** État de santé de la lecture, alimenté par le moteur résilient. */
  health: PlaybackHealth;

  // --- derived ---
  current: () => PlayableTrack | null;

  // --- actions ---
  playNow: (track: PlayableTrack, queue?: PlayableTrack[]) => void;
  setQueue: (queue: PlayableTrack[], startIndex?: number) => void;
  enqueue: (track: PlayableTrack) => void;
  toggle: () => void;
  setPlaying: (playing: boolean) => void;
  next: () => void;
  previous: () => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  setPosition: (ms: number) => void;
  setExpanded: (v: boolean) => void;
  setHealth: (h: PlaybackHealth) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  currentIndex: -1,
  isPlaying: false,
  volume: 0.8,
  muted: false,
  repeat: 'off',
  shuffle: false,
  positionMs: 0,
  expanded: false,
  health: 'idle',

  current: () => {
    const { queue, currentIndex } = get();
    return currentIndex >= 0 ? (queue[currentIndex] ?? null) : null;
  },

  playNow: (track, queue) => {
    if (queue && queue.length > 0) {
      const idx = queue.findIndex((t) => t.id === track.id);
      set({ queue, currentIndex: idx >= 0 ? idx : 0, isPlaying: true, positionMs: 0 });
    } else {
      set((s) => ({
        queue: [track, ...s.queue.filter((t) => t.id !== track.id)],
        currentIndex: 0,
        isPlaying: true,
        positionMs: 0,
      }));
    }
  },

  setQueue: (queue, startIndex = 0) =>
    set({ queue, currentIndex: queue.length ? startIndex : -1, positionMs: 0 }),

  enqueue: (track) => set((s) => ({ queue: [...s.queue, track] })),

  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setPlaying: (playing) => set({ isPlaying: playing }),

  next: () => {
    const { queue, currentIndex, repeat, shuffle } = get();
    if (queue.length === 0) return;
    if (repeat === 'one') {
      set({ positionMs: 0, isPlaying: true });
      return;
    }
    let nextIndex: number;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = currentIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeat === 'all') nextIndex = 0;
        else {
          set({ isPlaying: false });
          return;
        }
      }
    }
    set({ currentIndex: nextIndex, positionMs: 0, isPlaying: true });
  },

  previous: () => {
    const { currentIndex, positionMs } = get();
    // Restart the track if we're more than 3s in (standard player behavior).
    if (positionMs > 3000) {
      set({ positionMs: 0 });
      return;
    }
    set({ currentIndex: Math.max(0, currentIndex - 1), positionMs: 0, isPlaying: true });
  },

  setVolume: (v) => set({ volume: Math.min(1, Math.max(0, v)), muted: v === 0 }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  cycleRepeat: () =>
    set((s) => ({
      repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off',
    })),
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  setPosition: (ms) => set({ positionMs: ms }),
  setExpanded: (v) => set({ expanded: v }),
  setHealth: (h) => set({ health: h }),
}));
