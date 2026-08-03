// ============================================================================
// MWANAKIN SOUND — registre des langues (i18n)
// ----------------------------------------------------------------------------
// Stratégie « continent par continent » : capter le monde entier en priorisant
// d'abord les langues qui portent le mieux la musique africaine, puis les
// grandes langues-relais mondiales. Le Lingala est la langue-vedette (RDC).
// ============================================================================

export type LocaleCode = 'fr' | 'en' | 'ln' | 'sw' | 'pt' | 'es' | 'ar';

export interface LocaleMeta {
  /** Code ISO 639-1. */
  code: LocaleCode;
  /** Nom dans la langue elle-même (endonyme). */
  name: string;
  /** Nom en français, pour les listes admin. */
  frenchName: string;
  /** Sens d'écriture — `rtl` pour l'arabe. */
  dir: 'ltr' | 'rtl';
  /** Statut de traduction : `native` = validé, `draft` = à relire par un locuteur. */
  status: 'native' | 'draft';
}

export const DEFAULT_LOCALE: LocaleCode = 'fr';

export const LOCALES: Record<LocaleCode, LocaleMeta> = {
  fr: { code: 'fr', name: 'Français', frenchName: 'Français', dir: 'ltr', status: 'native' },
  en: { code: 'en', name: 'English', frenchName: 'Anglais', dir: 'ltr', status: 'native' },
  ln: { code: 'ln', name: 'Lingála', frenchName: 'Lingala', dir: 'ltr', status: 'draft' },
  sw: { code: 'sw', name: 'Kiswahili', frenchName: 'Swahili', dir: 'ltr', status: 'draft' },
  pt: { code: 'pt', name: 'Português', frenchName: 'Portugais', dir: 'ltr', status: 'draft' },
  es: { code: 'es', name: 'Español', frenchName: 'Espagnol', dir: 'ltr', status: 'draft' },
  ar: { code: 'ar', name: 'العربية', frenchName: 'Arabe', dir: 'rtl', status: 'draft' },
};

/**
 * Langues recommandées par continent (pour proposer automatiquement la bonne
 * langue selon `profiles.country_code` / l'en-tête Accept-Language / la géo IP).
 * L'ordre reflète la priorité d'affichage.
 */
export const CONTINENT_LOCALES: Record<string, LocaleCode[]> = {
  Africa: ['ln', 'sw', 'fr', 'ar', 'en'],
  Europe: ['fr', 'en', 'es', 'pt'],
  Americas: ['en', 'es', 'pt', 'fr'],
  Asia: ['ar', 'en', 'fr'],
  Oceania: ['en', 'fr'],
};

export const SUPPORTED_LOCALES = Object.keys(LOCALES) as LocaleCode[];

export function isLocale(value: string): value is LocaleCode {
  return (SUPPORTED_LOCALES as string[]).includes(value);
}
