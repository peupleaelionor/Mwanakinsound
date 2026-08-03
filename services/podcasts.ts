import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import type { EpisodeWithPodcast, PodcastWithEpisodes } from '@/types/domain';
import type { Podcast } from '@/types/database.types';

/**
 * Accès données podcasts (serveur). Court-circuite quand Supabase n'est pas
 * configuré — même contrat de résilience que le reste des services.
 */

const EPISODE_WITH_PODCAST = '*, podcast:podcasts!inner(id, slug, title, cover_url)';

/** Derniers épisodes publiés, toutes séries confondues. */
export async function getLatestEpisodes(limit = 12): Promise<EpisodeWithPodcast[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('podcast_episodes')
    .select(EPISODE_WITH_PODCAST)
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data ?? []) as unknown as EpisodeWithPodcast[];
}

/** Séries publiées, éventuellement filtrées par catégorie. */
export async function getPodcasts(
  opts: { category?: string; limit?: number } = {},
): Promise<Podcast[]> {
  if (!isSupabaseConfigured) return [];
  const { category, limit = 20 } = opts;
  const supabase = await createClient();
  let query = supabase
    .from('podcasts')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (category) query = query.eq('category', category);
  const { data } = await query;
  return data ?? [];
}

/** Une série avec ses épisodes publiés. */
export async function getPodcastBySlug(slug: string): Promise<PodcastWithEpisodes | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data: podcast } = await supabase
    .from('podcasts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (!podcast) return null;

  const { data: episodes } = await supabase
    .from('podcast_episodes')
    .select('*')
    .eq('podcast_id', podcast.id)
    .eq('status', 'published')
    .order('episode_number', { ascending: true, nullsFirst: false });

  return { ...podcast, episodes: episodes ?? [] };
}
