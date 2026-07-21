/** App-wide constants. Keep pure & side-effect free. */

export const APP_NAME = 'Mwanakin Sound';
export const APP_TAGLINE = 'Le son du continent, à portée du monde.';

/** A play counts as a "stream" once this fraction of the track has played. */
export const STREAM_COMPLETION_RATIO = 0.5;

/** Bitrate presets — Africa-first data-saver ladder. */
export const AUDIO_QUALITY = {
  dataSaver: { label: 'Économie de données', bitrate: 64 },
  normal: { label: 'Normale', bitrate: 128 },
  high: { label: 'Haute', bitrate: 256 },
} as const;

export type AudioQualityKey = keyof typeof AUDIO_QUALITY;

/** Storage buckets (mirrors supabase/migrations/0007). */
export const BUCKETS = {
  avatars: 'avatars',
  artistCovers: 'artist-covers',
  albumCovers: 'album-covers',
  audioPreview: 'audio-preview',
  audioMaster: 'audio-master',
} as const;

/** Supported UI/content languages (ISO 639-1). */
export const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'ln', label: 'Lingala' },
  { code: 'sw', label: 'Kiswahili' },
] as const;
