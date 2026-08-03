import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/shares  { episodeId?|podcastId?, shareLink }
 * Journalise un partage. Auth requise (le partage nourrit l'engagement).
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Service indisponible' }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Connexion requise' }, { status: 401 });

  let body: { episodeId?: string; podcastId?: string; shareLink?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
  }

  if (!body.shareLink || (!body.episodeId && !body.podcastId)) {
    return NextResponse.json({ error: 'shareLink et une cible requis' }, { status: 400 });
  }

  const { error } = await supabase.from('social_shares').insert({
    user_id: user.id,
    share_link: body.shareLink,
    episode_id: body.episodeId ?? null,
    podcast_id: body.episodeId ? null : (body.podcastId ?? null),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
