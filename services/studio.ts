import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Artist, Track } from '@/types/database.types';

export interface StudioOverview {
  artist: Artist | null;
  tracks: Track[];
  totalStreams: number;
  totalLikes: number;
  last7Days: { day: string; streams: number }[];
  topCountries: { country_code: string | null; streams: number }[];
}

/**
 * Aggregates the signed-in user's Artist Studio dashboard from pre-rolled
 * analytics_daily (never scans raw streams at request time).
 */
export async function getStudioOverview(userId: string): Promise<StudioOverview> {
  const supabase = await createClient();

  const { data: artist } = await supabase
    .from('artists')
    .select('*')
    .eq('owner_id', userId)
    .maybeSingle();

  if (!artist) {
    return {
      artist: null,
      tracks: [],
      totalStreams: 0,
      totalLikes: 0,
      last7Days: [],
      topCountries: [],
    };
  }

  const [tracksRes, analyticsRes] = await Promise.all([
    supabase
      .from('tracks')
      .select('*')
      .eq('artist_id', artist.id)
      .order('play_count', { ascending: false }),
    supabase
      .from('analytics_daily')
      .select('day, country_code, stream_count')
      .eq('artist_id', artist.id)
      .gte('day', new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)),
  ]);

  const tracks = tracksRes.data ?? [];
  const rows = analyticsRes.data ?? [];

  const totalStreams = rows.reduce((sum, r) => sum + (r.stream_count ?? 0), 0);
  const totalLikes = tracks.reduce((sum, t) => sum + t.like_count, 0);

  // Last 7 days series.
  const byDay = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const day = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    byDay.set(day, 0);
  }
  for (const r of rows) {
    if (byDay.has(r.day)) byDay.set(r.day, (byDay.get(r.day) ?? 0) + (r.stream_count ?? 0));
  }
  const last7Days = [...byDay.entries()].map(([day, streams]) => ({ day, streams }));

  // Top countries.
  const byCountry = new Map<string | null, number>();
  for (const r of rows) {
    byCountry.set(r.country_code, (byCountry.get(r.country_code) ?? 0) + (r.stream_count ?? 0));
  }
  const topCountries = [...byCountry.entries()]
    .map(([country_code, streams]) => ({ country_code, streams }))
    .sort((a, b) => b.streams - a.streams)
    .slice(0, 5);

  return { artist, tracks, totalStreams, totalLikes, last7Days, topCountries };
}
