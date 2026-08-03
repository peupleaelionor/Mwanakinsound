/**
 * Feature flags MABELE.
 *
 * Toute brique externe (agent, moteur de crédit) est derrière un flag : l'app
 * doit rester pleinement fonctionnelle quand la brique est absente ou en panne.
 */

export interface MabeleFlags {
  /** Client `admin-rdc-agent` actif (modération + assistance). */
  AGENT_ENABLED: boolean;
  /** Attribution et affichage des MwanaCoins. */
  MWANACOINS_ENABLED: boolean;
  /** Canaux temps réel (presence). Coupé d'office en réseau dégradé. */
  REALTIME_ENABLED: boolean;
}

function readFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

let cached: MabeleFlags | null = null;

export function flags(): MabeleFlags {
  if (cached) return cached;
  const env = typeof process !== 'undefined' ? process.env : ({} as Record<string, string>);
  cached = {
    // Désactivé par défaut : aucune brique MABELE n'est branchée à ce stade.
    AGENT_ENABLED: readFlag(env.NEXT_PUBLIC_AGENT_ENABLED, false),
    MWANACOINS_ENABLED: readFlag(env.NEXT_PUBLIC_MWANACOINS_ENABLED, true),
    REALTIME_ENABLED: readFlag(env.NEXT_PUBLIC_REALTIME_ENABLED, true),
  };
  return cached;
}

/** Réservé aux tests. */
export function __resetFlags(): void {
  cached = null;
}
