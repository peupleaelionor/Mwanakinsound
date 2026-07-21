import type { Track, Artist, Album } from './database.types';

/** A track joined with the minimal artist info the UI needs. */
export interface TrackWithArtist extends Track {
  artist: Pick<Artist, 'id' | 'name' | 'slug' | 'verified'>;
}

/** What the audio player actually needs to play something. */
export interface PlayableTrack {
  id: string;
  title: string;
  artistName: string;
  artistId: string;
  coverUrl: string | null;
  durationMs: number;
  /** Resolved, ready-to-stream audio URL (preview or master). */
  audioUrl: string;
}

export type ArtistWithStats = Artist & {
  album_count?: number;
  track_count?: number;
};

export type AlbumWithArtist = Album & {
  artist: Pick<Artist, 'id' | 'name' | 'slug'>;
};
