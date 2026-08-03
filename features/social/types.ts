import type { ReactionEmoji } from '@/types/database.types';

/** Contrat partagé entre l'API (`app/api/comments`) et l'UI sociale. */
export interface CommentDTO {
  id: string;
  content: string;
  hashtags: string[];
  createdAt: string;
  author: { username: string; displayName: string; avatarUrl: string | null };
  reactions: Record<ReactionEmoji, number>;
  myReactions: ReactionEmoji[];
}

export const REACTION_EMOJIS: ReactionEmoji[] = ['❤️', '🔥', '🙏', '🎶'];

export interface CommentTarget {
  episodeId?: string;
  podcastId?: string;
}
