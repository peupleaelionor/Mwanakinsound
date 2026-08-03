import { describe, expect, it } from 'vitest';
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALES,
  CONTINENT_LOCALES,
  getDictionary,
  translate,
  createTranslator,
} from '@/lib/i18n';

/** Aplatie un dictionnaire imbriqué en un jeu de clés pointées (`nav.home`). */
function flatKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === 'object' ? flatKeys(v as Record<string, unknown>, key) : [key];
  });
}

const referenceKeys = flatKeys(getDictionary(DEFAULT_LOCALE)).sort();

describe('i18n — parité des dictionnaires', () => {
  it('chaque langue expose exactement les mêmes clés que la référence (fr)', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const keys = flatKeys(getDictionary(locale)).sort();
      expect(keys, `clés manquantes/en trop pour « ${locale} »`).toEqual(referenceKeys);
    }
  });

  it('aucune valeur traduite n’est vide', () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const key of referenceKeys) {
        expect(translate(locale, key).trim().length, `${locale}:${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('la marque officielle reste « MWANAKIN SOUND » dans toutes les langues', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(translate(locale, 'common.brand')).toBe('MWANAKIN SOUND');
    }
  });
});

describe('i18n — chargeur', () => {
  it('replie sur le français puis sur la clé brute', () => {
    expect(translate('xx', 'nav.home')).toBe('Accueil'); // langue inconnue → référence fr
    expect(translate('fr', 'clef.inexistante')).toBe('clef.inexistante');
  });

  it('interpole les jetons {var}', () => {
    // La clé n’existe pas → on interpole malgré tout le repli (= la clé brute).
    expect(translate('fr', 'Bonjour {name}', { name: 'Kin' })).toBe('Bonjour Kin');
  });

  it('createTranslator fige la langue', () => {
    const t = createTranslator('en');
    expect(t('nav.discover')).toBe('Discover');
  });
});

describe('i18n — registre des langues', () => {
  it('le lingala est présent et l’arabe est en RTL', () => {
    expect(LOCALES.ln.frenchName).toBe('Lingala');
    expect(LOCALES.ar.dir).toBe('rtl');
  });

  it('chaque continent ne référence que des langues supportées', () => {
    for (const [continent, locales] of Object.entries(CONTINENT_LOCALES)) {
      for (const locale of locales) {
        expect(SUPPORTED_LOCALES, `${continent} → ${locale}`).toContain(locale);
      }
    }
  });
});
