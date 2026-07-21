import { env } from '@/lib/env';
import { BUCKETS } from '@/lib/constants';
import type { TrackWithArtist } from '@/types/domain';
import type { PlayableTrack } from '@/types/domain';

/**
 * Resolve a stored audio path to a playable URL.
 *
 * Strategy (Africa-first, cost-aware):
 *  - Public 30s previews live in Supabase Storage (cheap, cacheable, instant).
 *  - Full masters live in Cloudflare R2 behind the CDN and require a signed URL
 *    minted server-side for entitled (premium) listeners.
 *
 * For v1 the app streams previews everywhere; the master path resolves through
 * R2 once the entitlement + signing Edge Function is deployed.
 */
export function resolvePreviewUrl(previewPath: string | null): string | null {
  if (!previewPath) return null;
  const base = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '');
  return `${base}/storage/v1/object/public/${BUCKETS.audioPreview}/${previewPath}`;
}

export function resolveMasterUrl(masterPath: string | null): string | null {
  if (!masterPath || !env.NEXT_PUBLIC_R2_PUBLIC_URL) return null;
  const base = env.NEXT_PUBLIC_R2_PUBLIC_URL.replace(/\/$/, '');
  return `${base}/${masterPath}`;
}

/** Map a catalog track to something the player can play. Returns null if unplayable. */
export function toPlayable(track: TrackWithArtist): PlayableTrack | null {
  const audioUrl =
    resolvePreviewUrl(track.audio_preview_path) ?? resolveMasterUrl(track.audio_master_path);
  if (!audioUrl) return null;
  return {
    id: track.id,
    title: track.title,
    artistName: track.artist.name,
    artistId: track.artist.id,
    coverUrl: track.cover_url,
    durationMs: track.duration_ms,
    audioUrl,
  };
}
