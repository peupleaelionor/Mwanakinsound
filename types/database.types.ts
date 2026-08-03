/**
 * Database types for MWANAKIN SOUND.
 *
 * Hand-maintained to mirror supabase/migrations and to satisfy supabase-js's
 * GenericSchema shape (each table declares Row/Insert/Update/Relationships).
 * In a linked Supabase project, regenerate with `npm run db:types`.
 */

export type UserRole = 'listener' | 'artist' | 'admin';
export type SubscriptionTier = 'free' | 'premium' | 'artist_pro';
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'expired';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';
export type PaymentProvider =
  | 'mpesa'
  | 'orange_money'
  | 'airtel_money'
  | 'flutterwave'
  | 'stripe';
export type ContentStatus =
  | 'draft'
  | 'processing'
  | 'published'
  | 'archived'
  | 'flagged';
export type AlbumKind = 'album' | 'ep' | 'single' | 'compilation' | 'mixtape';
export type AudioMood =
  | 'energetic'
  | 'chill'
  | 'happy'
  | 'melancholic'
  | 'romantic'
  | 'spiritual'
  | 'dance'
  | 'focus';

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  role: UserRole;
  country_code: string | null;
  city: string | null;
  preferred_language: string;
  data_saver: boolean;
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
}

export type Artist = {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  bio: string | null;
  ai_bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  country_code: string | null;
  city: string | null;
  verified: boolean;
  monthly_listeners: number;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export type Album = {
  id: string;
  artist_id: string;
  title: string;
  slug: string;
  kind: AlbumKind;
  cover_url: string | null;
  release_date: string | null;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export type Track = {
  id: string;
  artist_id: string;
  album_id: string | null;
  title: string;
  slug: string;
  audio_preview_path: string | null;
  audio_master_path: string | null;
  cover_url: string | null;
  duration_ms: number;
  track_number: number | null;
  language: string | null;
  mood: AudioMood | null;
  bpm: number | null;
  is_explicit: boolean;
  status: ContentStatus;
  play_count: number;
  like_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export type Genre = {
  id: string;
  slug: string;
  name: string;
  region: string | null;
  created_at: string;
}

export type Playlist = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  is_public: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export type PlaylistTrack = {
  playlist_id: string;
  track_id: string;
  position: number;
  added_at: string;
  added_by: string | null;
}

export type Like = {
  user_id: string;
  track_id: string;
  created_at: string;
}

export type Comment = {
  id: string;
  track_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

export type Follower = {
  follower_id: string;
  artist_id: string;
  created_at: string;
}

export type Stream = {
  id: number;
  track_id: string;
  user_id: string | null;
  artist_id: string;
  country_code: string | null;
  city: string | null;
  ms_played: number;
  completed: boolean;
  source: string | null;
  created_at: string;
}

export type AnalyticsDaily = {
  id: number;
  artist_id: string;
  track_id: string | null;
  day: string;
  country_code: string | null;
  stream_count: number;
  unique_listeners: number;
  avg_ms_played: number;
  completed_count: number;
}

export type Subscription = {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  provider: PaymentProvider | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export type Payment = {
  id: string;
  user_id: string | null;
  subscription_id: string | null;
  beneficiary_artist_id: string | null;
  provider: PaymentProvider;
  provider_ref: string | null;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export type PlayHistory = {
  id: number;
  user_id: string;
  track_id: string;
  played_at: string;
}

export type TrackGenre = {
  track_id: string;
  genre_id: string;
}

export type Podcast = {
  id: string;
  owner_id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  category: string | null;
  language: string | null;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export type PodcastEpisode = {
  id: string;
  podcast_id: string;
  title: string;
  slug: string;
  description: string | null;
  audio_path: string | null;
  duration_ms: number;
  episode_number: number | null;
  status: ContentStatus;
  play_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Grand livre MwanaCoins — points d'engagement social.
 * Sans valeur monétaire : aucune relation avec `payments` ou `subscriptions`.
 */
export type MwanaCoinsEntry = {
  id: number;
  user_id: string;
  kind: string;
  subject_id: string;
  points: number;
  created_at: string;
}

/** Generic table helper: Insert/Update default to partial rows. */
type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<Profile, Partial<Profile> & Pick<Profile, 'id' | 'username' | 'display_name'>>;
      artists: Table<Artist, Partial<Artist> & Pick<Artist, 'owner_id' | 'slug' | 'name'>>;
      albums: Table<Album, Partial<Album> & Pick<Album, 'artist_id' | 'title' | 'slug'>>;
      tracks: Table<Track, Partial<Track> & Pick<Track, 'artist_id' | 'title' | 'slug'>>;
      genres: Table<Genre, Partial<Genre> & Pick<Genre, 'slug' | 'name'>>;
      playlists: Table<Playlist, Partial<Playlist> & Pick<Playlist, 'owner_id' | 'title'>>;
      playlist_tracks: Table<PlaylistTrack, Pick<PlaylistTrack, 'playlist_id' | 'track_id' | 'position'> & Partial<PlaylistTrack>>;
      likes: Table<Like, Pick<Like, 'user_id' | 'track_id'> & Partial<Like>>;
      comments: Table<Comment, Pick<Comment, 'track_id' | 'user_id' | 'body'> & Partial<Comment>>;
      followers: Table<Follower, Pick<Follower, 'follower_id' | 'artist_id'> & Partial<Follower>>;
      streams: Table<Stream>;
      analytics_daily: Table<AnalyticsDaily>;
      subscriptions: Table<Subscription, Pick<Subscription, 'user_id'> & Partial<Subscription>>;
      payments: Table<Payment, Pick<Payment, 'provider' | 'amount_cents'> & Partial<Payment>>;
      play_history: Table<PlayHistory, Pick<PlayHistory, 'user_id' | 'track_id'> & Partial<PlayHistory>>;
      track_genres: Table<TrackGenre, TrackGenre>;
      // Lecture seule côté client : l'écriture passe par `award_mwana_coins`.
      mwana_coins_ledger: Table<MwanaCoinsEntry, never, never>;
      podcasts: Table<Podcast, Partial<Podcast> & Pick<Podcast, 'owner_id' | 'slug' | 'title'>>;
      podcast_episodes: Table<
        PodcastEpisode,
        Partial<PodcastEpisode> & Pick<PodcastEpisode, 'podcast_id' | 'title' | 'slug'>
      >;
    };
    Views: Record<never, never>;
    Functions: {
      recommend_tracks: {
        Args: { p_user_id?: string; p_limit?: number };
        Returns: Track[];
      };
      record_stream: {
        Args: {
          p_track_id: string;
          p_ms_played: number;
          p_completed?: boolean;
          p_source?: string;
          p_country_code?: string;
          p_city?: string;
        };
        Returns: undefined;
      };
      /** MwanaCoins — points d'engagement social, sans valeur monétaire. */
      award_mwana_coins: {
        Args: { p_kind: string; p_subject_id: string };
        Returns: number;
      };
      mwana_coins_balance: {
        Args: Record<string, never>;
        Returns: number;
      };
      record_episode_play: {
        Args: { p_episode_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      user_role: UserRole;
      subscription_tier: SubscriptionTier;
      subscription_status: SubscriptionStatus;
      payment_status: PaymentStatus;
      payment_provider: PaymentProvider;
      content_status: ContentStatus;
      album_kind: AlbumKind;
      audio_mood: AudioMood;
    };
    CompositeTypes: Record<never, never>;
  };
}
