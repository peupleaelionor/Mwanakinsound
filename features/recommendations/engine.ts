import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { Track } from '@/types/database.types';

/**
 * Recommendation engine contract.
 *
 * v1 is a transparent, SQL-scored implementation (see SqlRecommendationEngine)
 * that blends genre affinity, locale, freshness, and popularity. The interface
 * is intentionally minimal so a future embeddings/vector engine (pgvector, an
 * external model, or a hybrid re-ranker) can be swapped in without touching
 * callers. Everything downstream depends on THIS interface, never the impl.
 */
export interface RecommendationEngine {
  /** Personalized "For You" tracks for a user (falls back to trending if anon). */
  forUser(userId: string | null, limit?: number): Promise<Track[]>;
}

export class SqlRecommendationEngine implements RecommendationEngine {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async forUser(userId: string | null, limit = 20): Promise<Track[]> {
    const { data, error } = await this.supabase.rpc('recommend_tracks', {
      p_user_id: userId ?? undefined,
      p_limit: limit,
    });
    if (error) {
      // Never break discovery on a recommendation failure — degrade to empty,
      // callers layer trending on top.
      console.error('[recommendations] rpc failed:', error.message);
      return [];
    }
    return (data ?? []) as Track[];
  }
}
