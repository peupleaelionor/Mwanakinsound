import { describe, expect, it } from 'vitest';
import { StubCreditEngine, POINTS, DAILY_CAPS } from '@mabele/credit';
import type { EngagementEvent } from '@mabele/core';

const event = (kind: EngagementEvent['kind'], subjectId = 's1'): EngagementEvent => ({
  kind,
  subjectId,
  at: Date.now(),
});

describe('MwanaCoins — barème', () => {
  it('couvre tous les types d’engagement', () => {
    for (const kind of Object.keys(POINTS) as Array<keyof typeof POINTS>) {
      expect(POINTS[kind]).toBeGreaterThan(0);
      expect(DAILY_CAPS[kind]).toBeGreaterThan(0);
    }
  });

  it('valorise la création plus que la consommation', () => {
    expect(POINTS['track.published']).toBeGreaterThan(POINTS['track.completed']);
    expect(POINTS['track.shared']).toBeGreaterThan(POINTS['track.completed']);
  });
});

describe('StubCreditEngine', () => {
  it('attribue les points du barème', async () => {
    const engine = new StubCreditEngine();
    const awarded = await engine.award(event('track.liked'));
    expect(awarded).toBe(POINTS['track.liked']);
    expect(await engine.balance()).toBe(POINTS['track.liked']);
  });

  it('applique le plafond quotidien — anti-abus', async () => {
    const engine = new StubCreditEngine();
    const cap = DAILY_CAPS['track.shared'];

    for (let i = 0; i < cap; i++) {
      expect(await engine.award(event('track.shared', `s${i}`))).toBe(POINTS['track.shared']);
    }
    // Au-delà du plafond, plus rien n'est crédité.
    expect(await engine.award(event('track.shared', 'extra'))).toBe(0);
    expect(await engine.balance()).toBe(cap * POINTS['track.shared']);
  });

  it('conserve un historique consultable', async () => {
    const engine = new StubCreditEngine();
    await engine.award(event('comment.posted', 'c1'));
    await engine.award(event('track.liked', 't1'));
    const history = await engine.history();
    expect(history).toHaveLength(2);
    expect(history[0]?.kind).toBe('track.liked'); // plus récent en tête
  });
});

describe('garde-fou : MwanaCoins n’est pas une monnaie', () => {
  it('l’interface n’expose aucune opération monétaire', () => {
    const engine = new StubCreditEngine();
    const surface = [
      ...Object.getOwnPropertyNames(Object.getPrototypeOf(engine)),
      ...Object.keys(engine),
    ];
    for (const forbidden of ['buy', 'purchase', 'withdraw', 'convert', 'transfer', 'cashout']) {
      expect(surface).not.toContain(forbidden);
    }
  });
});
