import { toPlayable } from '@/lib/audio-url';
import type { TrackWithArtist } from '@/types/domain';
import type { TrackCardData } from '@/components/track-shelf';

/**
 * Map catalog tracks to shelf card data, dropping any that can't be played
 * (no preview/master yet). Keeps unplayable drafts out of listener-facing UI.
 */
export function toTrackCards(tracks: TrackWithArtist[]): TrackCardData[] {
  return tracks
    .map((t) => {
      const playable = toPlayable(t);
      if (!playable) return null;
      const card: TrackCardData = { ...playable, verified: t.artist.verified };
      return card;
    })
    .filter((c): c is TrackCardData => c !== null);
}
