import { describe, expect, it } from 'vitest';
import { extractHashtags, segmentComment } from '@/features/social/hashtags';
import { computeBadges } from '@/features/social/badges';

describe('extractHashtags', () => {
  it('extrait, normalise et dédoublonne', () => {
    expect(extractHashtags('J’adore #Soukous et #soukous et #Rumba !')).toEqual([
      'soukous',
      'rumba',
    ]);
  });

  it('ignore un # isolé', () => {
    expect(extractHashtags('juste un # tout seul')).toEqual([]);
  });

  it('gère un texte sans hashtag', () => {
    expect(extractHashtags('aucun tag ici')).toEqual([]);
  });
});

describe('segmentComment', () => {
  it('découpe texte et hashtags dans l’ordre', () => {
    const segments = segmentComment('top #kin son');
    expect(segments).toEqual([
      { type: 'text', value: 'top ' },
      { type: 'hashtag', value: '#kin', tag: 'kin' },
      { type: 'text', value: ' son' },
    ]);
  });

  it('reconstruit le texte original', () => {
    const text = '#a milieu #b fin';
    const rebuilt = segmentComment(text)
      .map((s) => s.value)
      .join('');
    expect(rebuilt).toBe(text);
  });
});

describe('computeBadges', () => {
  it('n’attribue rien à un nouvel utilisateur', () => {
    expect(computeBadges({ commentCount: 0, reactionGiven: 0, prayerReactions: 0 })).toEqual([]);
  });

  it('attribue Top Commentateur au seuil', () => {
    const badges = computeBadges({ commentCount: 50, reactionGiven: 0, prayerReactions: 0 });
    expect(badges.map((b) => b.id)).toContain('top_commentateur');
  });

  it('attribue Maître Spirituel sur les réactions 🙏', () => {
    const badges = computeBadges({ commentCount: 0, reactionGiven: 40, prayerReactions: 30 });
    expect(badges.map((b) => b.id)).toContain('maitre_spirituel');
  });
});
