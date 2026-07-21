import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { BUCKETS } from '@/lib/constants';

/** Upload guards mirrored from the Storage bucket policies (migration 0007). */
export const UPLOAD_LIMITS = {
  audioPreview: { maxBytes: 10 * 1024 * 1024, mimes: ['audio/mpeg', 'audio/aac', 'audio/ogg'] },
  cover: { maxBytes: 5 * 1024 * 1024, mimes: ['image/jpeg', 'image/png', 'image/webp'] },
} as const;

export class UploadError extends Error {}

function validate(file: File, limit: { maxBytes: number; mimes: readonly string[] }) {
  if (!limit.mimes.includes(file.type)) {
    throw new UploadError(`Format non supporté (${file.type || 'inconnu'}).`);
  }
  if (file.size > limit.maxBytes) {
    throw new UploadError(
      `Fichier trop volumineux (max ${Math.round(limit.maxBytes / 1024 / 1024)} Mo).`,
    );
  }
}

/** Read an audio file's duration in ms (client-side, no upload needed). */
export function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src);
      resolve(Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : 0);
    };
    audio.onerror = () => resolve(0);
    audio.src = URL.createObjectURL(file);
  });
}

/**
 * Upload a cover image to the album-covers bucket under the user's prefix.
 * Returns the public URL.
 */
export async function uploadCover(
  supabase: SupabaseClient<Database>,
  userId: string,
  file: File,
): Promise<string> {
  validate(file, UPLOAD_LIMITS.cover);
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKETS.albumCovers)
    .upload(path, file, { cacheControl: '31536000', upsert: false });
  if (error) throw new UploadError(error.message);
  const { data } = supabase.storage.from(BUCKETS.albumCovers).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload an audio preview to the audio-preview bucket under the user's prefix.
 * Returns the storage path (not a full URL — the resolver signs/prefixes it).
 */
export async function uploadAudioPreview(
  supabase: SupabaseClient<Database>,
  userId: string,
  file: File,
): Promise<string> {
  validate(file, UPLOAD_LIMITS.audioPreview);
  const ext = file.name.split('.').pop() ?? 'mp3';
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKETS.audioPreview)
    .upload(path, file, { cacheControl: '31536000', upsert: false });
  if (error) throw new UploadError(error.message);
  return path;
}
