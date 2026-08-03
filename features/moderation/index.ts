import 'server-only';
import { localCheck, LocalModerator, type Moderator, type ModerationResult } from './local';

/**
 * Modération de commentaires.
 *
 * Deux couches :
 *  1. **Garde local** (`./local`, toujours actif, gratuit) : longueur + liste
 *     noire. Bloque le pire sans appel réseau — indispensable en 2G.
 *  2. **Perspective API** (optionnel, derrière `PERSPECTIVE_API_KEY`) : score de
 *     toxicité. Borné dans le temps et **fail-open** : une panne de l'API ne
 *     doit jamais empêcher un utilisateur de commenter.
 */

export type { Moderator, ModerationResult };

const PERSPECTIVE_ENDPOINT = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';
const PERSPECTIVE_TIMEOUT_MS = 3_000;
const TOXICITY_THRESHOLD = 0.85;

class PerspectiveModerator implements Moderator {
  constructor(private readonly apiKey: string) {}

  async check(text: string): Promise<ModerationResult> {
    // Le garde local passe en premier : rapide et sans réseau.
    const local = localCheck(text);
    if (!local.allowed) return local;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PERSPECTIVE_TIMEOUT_MS);
    try {
      const res = await fetch(`${PERSPECTIVE_ENDPOINT}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          comment: { text },
          languages: ['fr', 'en'],
          requestedAttributes: { TOXICITY: {} },
        }),
      });
      if (!res.ok) return { allowed: true }; // fail-open sur erreur d'infra
      const json = (await res.json()) as {
        attributeScores?: { TOXICITY?: { summaryScore?: { value?: number } } };
      };
      const score = json.attributeScores?.TOXICITY?.summaryScore?.value ?? 0;
      if (score >= TOXICITY_THRESHOLD) {
        return { allowed: false, reason: 'Commentaire jugé toxique.', score };
      }
      return { allowed: true, score };
    } catch {
      // Timeout ou réseau : on laisse passer (le garde local a déjà filtré).
      return { allowed: true };
    } finally {
      clearTimeout(timer);
    }
  }
}

export function getModerator(): Moderator {
  const key = process.env.PERSPECTIVE_API_KEY;
  return key ? new PerspectiveModerator(key) : new LocalModerator();
}
