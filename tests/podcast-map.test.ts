import { describe, expect, it, vi } from 'vitest';

// Le mapper lit NEXT_PUBLIC_SUPABASE_URL via lib/env : on fixe une valeur.
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://demo.supabase.co');
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');

const { episodeToPlayable, toEpisodeCards, resolveEpisodeUrl } =
  await import('@/features/podcasts/map-episode');
import type { EpisodeWithPodcast } from '@/types/domain';

const episode = (overrides: Partial<EpisodeWithPodcast> = {}): EpisodeWithPodcast => ({
  id: 'ep1',
  podcast_id: 'p1',
  title: 'Épisode 1',
  slug: 'ep-1',
  description: null,
  audio_path: 'user123/ep1.opus',
  duration_ms: 480_000,
  episode_number: 1,
  status: 'published',
  play_count: 0,
  published_at: '2026-01-01',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  podcast: { id: 'p1', slug: 'ma-serie', title: 'Ma Série', cover_url: null },
  ...overrides,
});

describe('resolveEpisodeUrl', () => {
  it('construit une URL publique du bucket podcast-audio', () => {
    expect(resolveEpisodeUrl('user123/ep1.opus')).toBe(
      'https://demo.supabase.co/storage/v1/object/public/podcast-audio/user123/ep1.opus',
    );
  });

  it('renvoie null sans chemin', () => {
    expect(resolveEpisodeUrl(null)).toBeNull();
  });
});

describe('episodeToPlayable', () => {
  it('mappe un épisode vers la forme jouable, avec lien podcast', () => {
    const playable = episodeToPlayable(episode());
    expect(playable).not.toBeNull();
    expect(playable?.title).toBe('Épisode 1');
    // La série est portée par les champs artist* du lecteur.
    expect(playable?.artistName).toBe('Ma Série');
    expect(playable?.artistId).toBe('p1');
    // Le lien pointe vers la page podcast, pas vers un artiste.
    expect(playable?.linkHref).toBe('/podcasts/ma-serie');
  });

  it('écarte un épisode sans audio (brouillon)', () => {
    expect(episodeToPlayable(episode({ audio_path: null }))).toBeNull();
  });
});

describe('toEpisodeCards', () => {
  it('filtre les épisodes non jouables', () => {
    const cards = toEpisodeCards([
      episode({ id: 'a' }),
      episode({ id: 'b', audio_path: null }),
      episode({ id: 'c' }),
    ]);
    expect(cards.map((c) => c.id)).toEqual(['a', 'c']);
  });
});
