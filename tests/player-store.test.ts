import { beforeEach, describe, expect, it } from 'vitest';
import { usePlayerStore } from '@/features/player/player-store';
import type { PlayableTrack } from '@/types/domain';

const track = (id: string): PlayableTrack => ({
  id,
  title: `Track ${id}`,
  artistName: 'Artist',
  artistId: 'a1',
  coverUrl: null,
  durationMs: 200_000,
  audioUrl: `https://cdn/${id}.mp3`,
});

const queue = [track('1'), track('2'), track('3')];

describe('player store', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      queue: [],
      currentIndex: -1,
      isPlaying: false,
      repeat: 'off',
      shuffle: false,
      positionMs: 0,
    });
  });

  it('plays a track within its queue', () => {
    usePlayerStore.getState().playNow(track('2'), queue);
    const s = usePlayerStore.getState();
    expect(s.currentIndex).toBe(1);
    expect(s.isPlaying).toBe(true);
    expect(s.current()?.id).toBe('2');
  });

  it('advances to the next track', () => {
    usePlayerStore.getState().setQueue(queue, 0);
    usePlayerStore.getState().next();
    expect(usePlayerStore.getState().currentIndex).toBe(1);
  });

  it('stops at the end when repeat is off', () => {
    usePlayerStore.getState().setQueue(queue, 2);
    usePlayerStore.setState({ isPlaying: true });
    usePlayerStore.getState().next();
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('wraps around when repeat is all', () => {
    usePlayerStore.getState().setQueue(queue, 2);
    usePlayerStore.setState({ repeat: 'all' });
    usePlayerStore.getState().next();
    expect(usePlayerStore.getState().currentIndex).toBe(0);
  });

  it('restarts the track on previous when past 3s', () => {
    usePlayerStore.getState().setQueue(queue, 1);
    usePlayerStore.setState({ positionMs: 5_000 });
    usePlayerStore.getState().previous();
    const s = usePlayerStore.getState();
    expect(s.currentIndex).toBe(1);
    expect(s.positionMs).toBe(0);
  });
});
