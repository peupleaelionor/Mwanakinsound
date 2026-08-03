import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import type { ReactionEmoji } from '@/types/database.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMOJIS: ReactionEmoji[] = ['❤️', '🔥', '🙏', '🎶'];

/**
 * POST /api/reactions  { commentId, emoji }
 * Bascule une réaction (ajoute si absente, retire si présente). Idempotent par
 * (utilisateur, commentaire, emoji) grâce à la contrainte unique en base.
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

  let body: { commentId?: string; emoji?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
  }

  const { commentId } = body;
  if (!commentId || !body.emoji || !EMOJIS.includes(body.emoji as ReactionEmoji)) {
    return NextResponse.json({ error: 'commentId et emoji valide requis' }, { status: 400 });
  }
  const emoji = body.emoji as ReactionEmoji;

  // Existe déjà ? → on bascule.
  const { data: existing } = await supabase
    .from('comment_reactions')
    .select('id')
    .eq('user_id', user.id)
    .eq('comment_id', commentId)
    .eq('emoji', emoji)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('comment_reactions').delete().eq('id', existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ emoji, active: false });
  }

  const { error } = await supabase
    .from('comment_reactions')
    .insert({ user_id: user.id, comment_id: commentId, emoji: emoji as ReactionEmoji });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ emoji, active: true });
}
