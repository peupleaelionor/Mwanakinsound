/**
 * Badges d'engagement — dérivés de compteurs, calculés côté application.
 *
 * Pas de table dédiée : un badge est une **fonction pure** de l'activité de
 * l'utilisateur. Ça évite un état à maintenir synchronisé, et rend les seuils
 * triviaux à tester et à ajuster.
 */

export interface SocialStats {
  commentCount: number;
  reactionGiven: number;
  /** Réactions 🙏 données — proxy d'engagement « spirituel ». */
  prayerReactions: number;
}

export interface Badge {
  id: string;
  label: string;
  emoji: string;
}

/** Seuils volontairement atteignables pour récompenser tôt l'engagement. */
export const BADGE_RULES: Array<{
  id: string;
  label: string;
  emoji: string;
  earned: (s: SocialStats) => boolean;
}> = [
  {
    id: 'top_commentateur',
    label: 'Top Commentateur',
    emoji: '💬',
    earned: (s) => s.commentCount >= 50,
  },
  {
    id: 'maitre_spirituel',
    label: 'Maître Spirituel',
    emoji: '🙏',
    earned: (s) => s.prayerReactions >= 30,
  },
  {
    id: 'ame_engagee',
    label: 'Âme Engagée',
    emoji: '🔥',
    earned: (s) => s.reactionGiven >= 100,
  },
];

export function computeBadges(stats: SocialStats): Badge[] {
  return BADGE_RULES.filter((rule) => rule.earned(stats)).map(({ id, label, emoji }) => ({
    id,
    label,
    emoji,
  }));
}
