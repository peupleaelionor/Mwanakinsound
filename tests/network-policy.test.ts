import { describe, expect, it } from 'vitest';
import { classify, dataPolicyFor } from '@mabele/core';

describe('classify — palier réseau', () => {
  const base = {
    online: true,
    effectiveType: null,
    downlinkMbps: null,
    rttMs: null,
    saveData: false,
  };

  it('détecte le hors-ligne en priorité absolue', () => {
    expect(classify({ ...base, online: false, downlinkMbps: 50 })).toBe('offline');
  });

  it("respecte le choix de l'utilisateur avant toute mesure", () => {
    expect(classify({ ...base, saveData: true, effectiveType: '4g', downlinkMbps: 40 })).toBe(
      'poor',
    );
  });

  it('classe 2G et slow-2g comme dégradé', () => {
    expect(classify({ ...base, effectiveType: '2g' })).toBe('poor');
    expect(classify({ ...base, effectiveType: 'slow-2g' })).toBe('poor');
  });

  it('classe le profil Bandal (~400 kb/s, ~400 ms) comme dégradé', () => {
    expect(classify({ ...base, downlinkMbps: 0.4, rttMs: 400 })).toBe('poor');
  });

  it('ne suppose jamais la fibre en absence de signal', () => {
    expect(classify(base)).toBe('moderate');
  });

  it('reconnaît une bonne connexion', () => {
    expect(classify({ ...base, effectiveType: '4g', downlinkMbps: 10, rttMs: 40 })).toBe('good');
  });
});

describe('dataPolicyFor — politique de consommation', () => {
  it('coupe le préchargement et le temps réel en réseau dégradé', () => {
    const policy = dataPolicyFor('poor');
    expect(policy.prefetchNextTrack).toBe(false);
    expect(policy.allowRealtime).toBe(false);
    expect(policy.audioBitrateKbps).toBe(64);
  });

  it('vise un tampon plus large quand le réseau est mauvais', () => {
    expect(dataPolicyFor('poor').targetBufferSeconds).toBeGreaterThan(
      dataPolicyFor('good').targetBufferSeconds,
    );
  });

  it('le mode économie du profil dégrade même sur une bonne connexion', () => {
    const policy = dataPolicyFor('good', true);
    expect(policy.prefetchNextTrack).toBe(false);
    expect(policy.fullResArtwork).toBe(false);
    expect(policy.audioBitrateKbps).toBe(64);
  });

  it('ne précharge rien hors ligne', () => {
    expect(dataPolicyFor('offline').prefetchNextTrack).toBe(false);
  });
});
