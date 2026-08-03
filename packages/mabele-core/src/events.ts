/**
 * Bus d'événements d'engagement — colonne vertébrale entre le produit et les
 * moteurs MABELE (credit-engine, trust-score, analytics).
 *
 * Le produit émet des faits ; il ne sait pas qui écoute. Brancher ou débrancher
 * MwanaCoins ne touche pas une ligne de code produit.
 */

export type EngagementKind =
  | 'track.completed'
  | 'track.liked'
  | 'track.shared'
  | 'comment.posted'
  | 'artist.followed'
  | 'track.published';

export interface EngagementEvent {
  kind: EngagementKind;
  /** Identifiant de l'entité concernée (track, artiste, commentaire…). */
  subjectId: string;
  /** Horodatage client, en ms. */
  at: number;
  /** Contexte libre, non sensible. */
  meta?: Record<string, string | number | boolean>;
}

type Listener = (event: EngagementEvent) => void;

const listeners = new Set<Listener>();

/** S'abonne au flux d'engagement. Retourne la fonction de désabonnement. */
export function onEngagement(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Émet un fait d'engagement. Ne lève jamais : un abonné défaillant ne doit
 * jamais casser le parcours utilisateur (règle « l'audio prime sur tout »).
 */
export function emitEngagement(
  kind: EngagementKind,
  subjectId: string,
  meta?: EngagementEvent['meta'],
): void {
  const event: EngagementEvent = { kind, subjectId, at: Date.now(), meta };
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // Silencieux par conception — voir docstring.
    }
  }
}

/** Réservé aux tests. */
export function __resetEngagementListeners(): void {
  listeners.clear();
}
