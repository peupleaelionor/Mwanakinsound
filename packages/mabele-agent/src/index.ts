/**
 * `@mabele/agent` — client `admin-rdc-agent` (adapter local).
 *
 * Règle absolue : l'agent est un **bonus**, jamais un point de passage
 * obligé. S'il est lent, absent ou en panne, l'utilisateur ne doit rien
 * remarquer. Tout appel est donc borné dans le temps et échoue en silence
 * vers une valeur de repli.
 */

export interface ModerationVerdict {
  allowed: boolean;
  reason?: string;
}

export interface AgentClient {
  /** Modère un contenu texte (commentaire, bio, titre). */
  moderate(text: string): Promise<ModerationVerdict>;
  /** Répond à une question d'assistance utilisateur. */
  assist(question: string, locale: string): Promise<string | null>;
}

const DEFAULT_TIMEOUT_MS = 5_000;

/** Borne un appel dans le temps ; renvoie `fallback` en cas de dépassement. */
export async function withTimeout<T>(
  promise: Promise<T>,
  fallback: T,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const guard = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), timeoutMs);
  });
  try {
    return await Promise.race([promise, guard]);
  } catch {
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Agent désactivé : tout passe, aucune assistance.
 * C'est l'implémentation active tant que `AGENT_ENABLED` est à `false`.
 *
 * TODO: brancher `admin-rdc-agent` de MABELE-CORE.
 */
export class DisabledAgentClient implements AgentClient {
  async moderate(): Promise<ModerationVerdict> {
    return { allowed: true };
  }
  async assist(): Promise<string | null> {
    return null;
  }
}

/**
 * Client HTTP générique vers l'agent. Chaque appel est borné et ne lève
 * jamais : la valeur de repli est permissive côté modération (on préfère
 * laisser passer que bloquer un utilisateur à cause d'une panne d'infra).
 */
export class HttpAgentClient implements AgentClient {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {}

  async moderate(text: string): Promise<ModerationVerdict> {
    return withTimeout(
      (async () => {
        const res = await fetch(`${this.baseUrl}/moderate`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) return { allowed: true };
        return (await res.json()) as ModerationVerdict;
      })(),
      { allowed: true },
      this.timeoutMs,
    );
  }

  async assist(question: string, locale: string): Promise<string | null> {
    return withTimeout(
      (async () => {
        const res = await fetch(`${this.baseUrl}/assist`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ question, locale }),
        });
        if (!res.ok) return null;
        const json = (await res.json()) as { answer?: string };
        return json.answer ?? null;
      })(),
      null,
      this.timeoutMs,
    );
  }
}
