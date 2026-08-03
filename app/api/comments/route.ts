import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { getModerator } from '@/features/moderation';
import type { ReactionEmoji } from '@/types/database.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 10; // lazy load 10 par 10 (contrainte du brief)

interface CommentDTO {
  id: string;
  content: string;
  hashtags: string[];
  createdAt: string;
  author: { username: string; displayName: string; avatarUrl: string | null };
  reactions: Record<ReactionEmoji, number>;
  myReactions: ReactionEmoji[];
}

function emptyReactions(): Record<ReactionEmoji, number> {
  return { '❤️': 0, '🔥': 0, '🙏': 0, '🎶': 0 };
}

/**
 * GET /api/comments?episodeId=…|podcastId=…&before=ISO
 * Fil de commentaires paginé (keyset sur created_at), enrichi des réactions.
 */
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ comments: [], nextCursor: null });

  const { searchParams } = request.nextUrl;
  const episodeId = searchParams.get('episodeId');
  const podcastId = searchParams.get('podcastId');
  const before = searchParams.get('before');
  if (!episodeId && !podcastId) {
    return NextResponse.json({ error: 'episodeId ou podcastId requis' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from('social_comments')
    .select(
      'id, content, hashtags, created_at, user_id, profiles!inner(username, display_name, avatar_url)',
    )
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1); // +1 pour savoir s'il reste une page

  query = episodeId ? query.eq('episode_id', episodeId) : query.eq('podcast_id', podcastId!);
  if (before) query = query.lt('created_at', before);

  const { data: rows, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const page = (rows ?? []).slice(0, PAGE_SIZE);
  const hasMore = (rows ?? []).length > PAGE_SIZE;
  const ids = page.map((r) => r.id);

  // Réactions des commentaires de la page, agrégées côté serveur.
  const counts = new Map<string, Record<ReactionEmoji, number>>();
  const mine = new Map<string, Set<ReactionEmoji>>();
  if (ids.length > 0) {
    const { data: reactions } = await supabase
      .from('comment_reactions')
      .select('comment_id, emoji, user_id')
      .in('comment_id', ids);
    for (const r of reactions ?? []) {
      const emoji = r.emoji as ReactionEmoji;
      if (!counts.has(r.comment_id)) counts.set(r.comment_id, emptyReactions());
      counts.get(r.comment_id)![emoji] += 1;
      if (user && r.user_id === user.id) {
        if (!mine.has(r.comment_id)) mine.set(r.comment_id, new Set());
        mine.get(r.comment_id)!.add(emoji);
      }
    }
  }

  const comments: CommentDTO[] = page.map((r) => {
    const profile = r.profiles as unknown as {
      username: string;
      display_name: string;
      avatar_url: string | null;
    };
    return {
      id: r.id,
      content: r.content,
      hashtags: r.hashtags,
      createdAt: r.created_at,
      author: {
        username: profile.username,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
      },
      reactions: counts.get(r.id) ?? emptyReactions(),
      myReactions: [...(mine.get(r.id) ?? [])],
    };
  });

  return NextResponse.json({
    comments,
    nextCursor: hasMore ? (page[page.length - 1]?.created_at ?? null) : null,
  });
}

/**
 * POST /api/comments  { episodeId?|podcastId?, content }
 * Crée un commentaire après modération. Auth requise.
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

  let body: { episodeId?: string; podcastId?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
  }

  const content = (body.content ?? '').trim();
  if (content.length === 0 || content.length > 280) {
    return NextResponse.json(
      { error: 'Le commentaire doit faire 1 à 280 caractères.' },
      { status: 422 },
    );
  }
  if (!body.episodeId && !body.podcastId) {
    return NextResponse.json({ error: 'episodeId ou podcastId requis' }, { status: 400 });
  }

  // Modération avant insertion.
  const verdict = await getModerator().check(content);
  if (!verdict.allowed) {
    return NextResponse.json({ error: verdict.reason ?? 'Commentaire refusé.' }, { status: 422 });
  }

  const { data, error } = await supabase
    .from('social_comments')
    .insert({
      user_id: user.id,
      content,
      episode_id: body.episodeId ?? null,
      podcast_id: body.episodeId ? null : (body.podcastId ?? null),
    })
    .select('id, content, hashtags, created_at')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Échec' }, { status: 500 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url')
    .eq('id', user.id)
    .single();

  const dto: CommentDTO = {
    id: data.id,
    content: data.content,
    hashtags: data.hashtags,
    createdAt: data.created_at,
    author: {
      username: profile?.username ?? 'moi',
      displayName: profile?.display_name ?? 'Moi',
      avatarUrl: profile?.avatar_url ?? null,
    },
    reactions: emptyReactions(),
    myReactions: [],
  };
  return NextResponse.json({ comment: dto }, { status: 201 });
}
