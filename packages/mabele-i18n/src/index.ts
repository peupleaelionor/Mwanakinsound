/**
 * `@mabele/i18n` — adapter local, volontairement minimal.
 *
 * Contrainte croisée : le budget « < 200 kb gzip » interdit un framework i18n
 * complet. On charge un dictionnaire JSON par langue, à la demande. Coût
 * runtime : quelques centaines d'octets.
 *
 * Langues de premier rang : Lingala et Kiswahili sont disponibles dès le
 * premier écran, au même niveau que le français (exigence du manifeste).
 */

export const LOCALES = ['fr', 'ln', 'sw', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: 'Français',
  ln: 'Lingála',
  sw: 'Kiswahili',
  en: 'English',
};

export const DEFAULT_LOCALE: Locale = 'fr';

export type Dictionary = Record<string, string>;

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * Choisit la locale de départ : préférence du profil, puis langue du
 * navigateur, puis français.
 */
export function resolveLocale(profileLocale?: string | null): Locale {
  if (profileLocale && isLocale(profileLocale)) return profileLocale;
  if (typeof navigator !== 'undefined') {
    for (const lang of navigator.languages ?? [navigator.language]) {
      const base = lang?.split('-')[0];
      if (base && isLocale(base)) return base;
    }
  }
  return DEFAULT_LOCALE;
}

/**
 * Charge un dictionnaire. `import()` dynamique = un chunk par langue, seule la
 * locale active est téléchargée.
 */
export async function loadDictionary(locale: Locale): Promise<Dictionary> {
  switch (locale) {
    case 'ln':
      return (await import('./dictionaries/ln.json')).default;
    case 'sw':
      return (await import('./dictionaries/sw.json')).default;
    case 'en':
      return (await import('./dictionaries/en.json')).default;
    default:
      return (await import('./dictionaries/fr.json')).default;
  }
}

/**
 * Fabrique une fonction de traduction. Repli sur la clé elle-même : une clé
 * manquante n'affiche jamais un écran vide.
 */
export function translator(dict: Dictionary) {
  return function t(key: string, vars?: Record<string, string | number>): string {
    const template = dict[key] ?? key;
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in vars ? String(vars[name]) : match,
    );
  };
}
