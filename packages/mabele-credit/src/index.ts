/**
 * `@mabele/credit` — contrat `credit-engine` + `trust-score` (adapter local).
 *
 * ════════════════════════════════════════════════════════════════════════
 *  MwanaCoins = points d'engagement social. PAS de la monnaie.
 * ════════════════════════════════════════════════════════════════════════
 * Cette interface est volontairement close : elle n'expose **ni** achat, **ni**
 * retrait, **ni** conversion, **ni** transfert entre utilisateurs. L'absence de
 * ces opérations est une garantie d'architecture, pas une simple convention —
 * il n'existe aucun chemin de code menant d'un solde MwanaCoins vers un moyen
 * de paiement. Toute PR qui ajouterait une telle opération viole la règle §2.4
 * du brief et doit être refusée.
 */

import type { EngagementEvent, EngagementKind } from '@mabele/core';

/** Points attribués par type d'engagement. Valeurs volontairement basses et plates. */
export const POINTS: Record<EngagementKind, number> = {
  'track.completed': 1,
  'track.liked': 2,
  'track.shared': 5,
  'comment.posted': 3,
  'artist.followed': 3,
  'track.published': 20,
};

/**
 * Plafonds quotidiens par type d'événement — anti-abus.
 * Sans plafond, un script gonflerait un solde en boucle.
 */
export const DAILY_CAPS: Record<EngagementKind, number> = {
  'track.completed': 100,
  'track.liked': 50,
  'track.shared': 20,
  'comment.posted': 30,
  'artist.followed': 20,
  'track.published': 10,
};

export interface CreditEntry {
  kind: EngagementKind;
  subjectId: string;
  points: number;
  createdAt: string;
}

export interface CreditEngine {
  /**
   * Attribue les points d'un événement. Retourne les points effectivement
   * accordés (0 si plafond atteint ou doublon).
   * L'attribution fait autorité **côté serveur** : une implémentation cliente
   * ne doit jamais être la source de vérité du solde.
   */
  award(event: EngagementEvent): Promise<number>;
  /** Solde courant de l'utilisateur connecté. */
  balance(): Promise<number>;
  /** Dernières attributions, pour l'historique affiché à l'utilisateur. */
  history(limit?: number): Promise<CreditEntry[]>;
}

export interface TrustScore {
  /** Score de confiance 0–100, dérivé de l'ancienneté et de la régularité. */
  current(): Promise<number>;
}

/**
 * Implémentation de repli, en mémoire.
 * Utilisée quand aucun backend de crédit n'est branché : l'app reste
 * fonctionnelle, les soldes ne persistent simplement pas.
 *
 * TODO: brancher le `credit-engine` de MABELE-CORE dès qu'il est disponible.
 */
export class StubCreditEngine implements CreditEngine {
  private points = 0;
  private entries: CreditEntry[] = [];
  private dailyCount = new Map<EngagementKind, number>();

  async award(event: EngagementEvent): Promise<number> {
    const used = this.dailyCount.get(event.kind) ?? 0;
    if (used >= DAILY_CAPS[event.kind]) return 0;

    const points = POINTS[event.kind] ?? 0;
    this.dailyCount.set(event.kind, used + 1);
    this.points += points;
    this.entries.unshift({
      kind: event.kind,
      subjectId: event.subjectId,
      points,
      createdAt: new Date(event.at).toISOString(),
    });
    return points;
  }

  async balance(): Promise<number> {
    return this.points;
  }

  async history(limit = 20): Promise<CreditEntry[]> {
    return this.entries.slice(0, limit);
  }
}

/** TODO: brancher le `trust-score` de MABELE-CORE. */
export class StubTrustScore implements TrustScore {
  async current(): Promise<number> {
    return 50;
  }
}
