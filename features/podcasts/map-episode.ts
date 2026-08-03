import { env } from '@/lib/env';
import type { EpisodeWithPodcast, PlayableTrack } from '@/types/domain';

/**
 * Résout la clé Storage d'un épisode en URL publique jouable.
 * Bucket public `podcast-audio` (voir migration 0009) : cacheable par le CDN.
 */
export function resolveEpisodeUrl(audioPath: string | null): string | null {
  if (!audioPath) return null;
  const base = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '');
  return `${base}/storage/v1/object/public/podcast-audio/${audioPath}`;
}

/**
 * Mappe un épisode vers la forme jouable par le lecteur.
 *
 * Le lecteur est agnostique : un épisode se joue exactement comme un morceau.
 * On réutilise `artistName`/`artistId` pour porter le titre et l'id de la série,
 * et `linkHref` pour renvoyer vers la page podcast plutôt que vers un artiste.
 * Retourne `null` si l'épisode n'a pas encore d'audio (brouillon).
 */
export function episodeToPlayable(episode: EpisodeWithPodcast): PlayableTrack | null {
  const audioUrl = resolveEpisodeUrl(episode.audio_path);
  if (!audioUrl) return null;
  return {
    id: episode.id,
    title: episode.title,
    artistName: episode.podcast.title,
    artistId: episode.podcast.id,
    coverUrl: episode.podcast.cover_url,
    durationMs: episode.duration_ms,
    audioUrl,
    linkHref: `/podcasts/${episode.podcast.slug}`,
  };
}

export function toEpisodeCards(episodes: EpisodeWithPodcast[]): PlayableTrack[] {
  return episodes.map(episodeToPlayable).filter((e): e is PlayableTrack => e !== null);
}
