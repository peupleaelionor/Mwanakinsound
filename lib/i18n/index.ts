// ============================================================================
// MWANAKIN SOUND — chargeur i18n minimal, sans dépendance.
// Utilisable côté Next.js (RSC/serveur) comme côté client, et portable tel quel
// dans le front kinshasa-beats (les dictionnaires sont du JSON pur).
// ============================================================================

import { DEFAULT_LOCALE, isLocale, type LocaleCode } from './locales';

import fr from './messages/fr.json';
import en from './messages/en.json';
import ln from './messages/ln.json';
import sw from './messages/sw.json';
import pt from './messages/pt.json';
import es from './messages/es.json';
import ar from './messages/ar.json';

type Dict = Record<string, unknown>;

const DICTIONARIES: Record<LocaleCode, Dict> = { fr, en, ln, sw, pt, es, ar };

export function getDictionary(locale: string): Dict {
  return DICTIONARIES[isLocale(locale) ? locale : DEFAULT_LOCALE];
}

function walk(dict: Dict, key: string): string | undefined {
  const value = key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Dict)) return (acc as Dict)[part];
    return undefined;
  }, dict);
  return typeof value === 'string' ? value : undefined;
}

/**
 * Traduit une clé pointée (ex. `nav.home`). Repli en cascade :
 * langue demandée → français (référence) → la clé elle-même.
 * `vars` interpole les jetons `{name}`.
 */
export function translate(
  locale: string,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const raw = walk(getDictionary(locale), key) ?? walk(fr as Dict, key) ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}

/** Fabrique un `t()` figé sur une langue — pratique dans un composant. */
export function createTranslator(locale: string) {
  return (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars);
}

export * from './locales';
