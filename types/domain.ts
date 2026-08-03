import type { Track, Artist, Album, Podcast, PodcastEpisode } from './database.types';

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
  /**
   * Lien vers la page source du média. Par défaut le lecteur pointe vers
   * `/artist/{artistId}` ; les podcasts fournissent leur propre lien
   * (`/podcasts/{slug}`) via ce champ.
   */
  linkHref?: string;
}

/** Un épisode joint à la série qui le porte. */
export interface EpisodeWithPodcast extends PodcastEpisode {
  podcast: Pick<Podcast, 'id' | 'slug' | 'title' | 'cover_url'>;
}

export type PodcastWithEpisodes = Podcast & {
  episodes: PodcastEpisode[];
};

export type ArtistWithStats = Artist & {
  album_count?: number;
  track_count?: number;
};

export type AlbumWithArtist = Album & {
  artist: Pick<Artist, 'id' | 'name' | 'slug'>;
};
