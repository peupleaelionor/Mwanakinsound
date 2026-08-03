/**
 * Garde de modération local — pur, sans dépendance serveur.
 *
 * Extrait dans son propre module (pas de `server-only`) pour être testable et
 * réutilisable côté client si besoin. C'est la seule couche toujours active :
 * longueur + liste noire minimale, appliquée avant tout appel réseau.
 */

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
  /** Score de toxicité 0–1 quand disponible. */
  score?: number;
}

export interface Moderator {
  check(text: string): Promise<ModerationResult>;
}

// Liste noire minimale et non exhaustive : le garde de dernier recours, pas la
// solution complète (Perspective couvre le reste quand il est configuré).
const HARD_BLOCKLIST = ['\\bnigger\\b', '\\bkill yourself\\b', '\\bkys\\b'];
const BLOCKLIST_RE = new RegExp(HARD_BLOCKLIST.join('|'), 'i');

export function localCheck(text: string): ModerationResult {
  const trimmed = text.trim();
  if (trimmed.length === 0) return { allowed: false, reason: 'Commentaire vide.' };
  if (trimmed.length > 280) return { allowed: false, reason: 'Maximum 280 caractères.' };
  if (BLOCKLIST_RE.test(trimmed)) {
    return { allowed: false, reason: 'Contenu inapproprié détecté.' };
  }
  return { allowed: true };
}

export class LocalModerator implements Moderator {
  async check(text: string): Promise<ModerationResult> {
    return localCheck(text);
  }
}
