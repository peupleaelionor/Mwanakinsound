import { describe, expect, it } from 'vitest';
import { computeBackoff } from '@/features/player/resilient-audio';

/**
 * Le back-off est la pièce la plus critique du MVP : trop agressif, il achève
 * un lien Edge déjà saturé ; trop lent, l'utilisateur croit que l'app est morte.
 */
describe('computeBackoff', () => {
  it('démarre au délai de base', () => {
    expect(computeBackoff(0, 1000, 30000)).toBe(1000);
  });

  it('croît exponentiellement', () => {
    expect(computeBackoff(1, 1000, 30000)).toBe(2000);
    expect(computeBackoff(2, 1000, 30000)).toBe(4000);
    expect(computeBackoff(3, 1000, 30000)).toBe(8000);
  });

  it('reste borné par le plafond', () => {
    expect(computeBackoff(20, 1000, 30000)).toBe(30000);
    expect(computeBackoff(100, 1000, 30000)).toBe(30000);
  });

  it('ne renvoie jamais de délai négatif ou nul', () => {
    for (let attempt = 0; attempt < 15; attempt++) {
      expect(computeBackoff(attempt)).toBeGreaterThan(0);
    }
  });

  it('est monotone croissant jusqu’au plafond', () => {
    let previous = 0;
    for (let attempt = 0; attempt < 8; attempt++) {
      const delay = computeBackoff(attempt, 1000, 30000);
      expect(delay).toBeGreaterThanOrEqual(previous);
      previous = delay;
    }
  });
});
