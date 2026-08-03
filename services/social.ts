import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { computeBadges, type Badge } from '@/features/social/badges';

export interface HashtagComment {
  id: string;
  content: string;
  createdAt: string;
  author: { username: string; displayName: string };
}

/** Commentaires récents portant un hashtag donné (index GIN sur `hashtags`). */
export async function getCommentsByHashtag(tag: string, limit = 30): Promise<HashtagComment[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('social_comments')
    .select('id, content, created_at, profiles!inner(username, display_name)')
    .contains('hashtags', [tag.toLowerCase()])
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => {
    const profile = r.profiles as unknown as { username: string; display_name: string };
    return {
      id: r.id,
      content: r.content,
      createdAt: r.created_at,
      author: { username: profile.username, displayName: profile.display_name },
    };
  });
}

/** Badges d'un utilisateur, dérivés de ses statistiques d'engagement. */
export async function getUserBadges(userId: string): Promise<Badge[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc('social_user_stats', { p_user: userId });
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return [];
  return computeBadges({
    commentCount: Number(row.comment_count ?? 0),
    reactionGiven: Number(row.reaction_given ?? 0),
    prayerReactions: Number(row.prayer_reactions ?? 0),
  });
}
