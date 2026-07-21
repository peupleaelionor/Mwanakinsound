'use client';

import { createClient } from '@/lib/supabase/client';

interface RecordStreamInput {
  trackId: string;
  msPlayed: number;
  completed?: boolean;
  source?: string;
}

/**
 * Fire-and-forget stream reporting. Calls the SECURITY DEFINER `record_stream`
 * RPC, which validates the track and updates counters/history server-side.
 * Failures are swallowed: analytics must never interrupt playback.
 */
export async function recordStream({
  trackId,
  msPlayed,
  completed = false,
  source,
}: RecordStreamInput): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.rpc('record_stream', {
      p_track_id: trackId,
      p_ms_played: msPlayed,
      p_completed: completed,
      p_source: source,
    });
  } catch {
    // Intentionally silent — see docstring.
  }
}
