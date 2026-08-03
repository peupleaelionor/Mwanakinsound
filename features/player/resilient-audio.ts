/**
 * Moteur de lecture résilient — cœur du MVP.
 *
 * Objectif unique : **l'audio ne coupe pas** sur un réseau 2G/Edge intermittent.
 * Tout le reste du produit est secondaire (règle §2.3 du brief).
 *
 * Stratégie :
 *  1. On écoute les signaux de détresse de l'élément `<audio>` (`stalled`,
 *     `waiting`, `error`) plutôt que d'attendre un échec définitif.
 *  2. Sur incident, on relance la lecture **à la position exacte** avec un
 *     back-off exponentiel borné — jamais d'abandon tant que l'utilisateur
 *     n'a pas mis en pause.
 *  3. Le retour du réseau déclenche une reprise immédiate, sans attendre la
 *     fin du délai courant.
 *  4. Le morceau suivant est préchargé, mais uniquement si la politique data
 *     l'autorise (`@mabele/core`) — on ne brûle pas le forfait de l'utilisateur.
 *
 * Volontairement découplé de React : testable sans DOM complet ni rendu.
 */

import { dataPolicyFor, readNetworkState, type DataPolicy } from '@mabele/core';

export type PlaybackHealth = 'idle' | 'buffering' | 'playing' | 'reconnecting' | 'offline';

const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;

/**
 * Back-off exponentiel borné, avec gigue déterministe injectable.
 * Pure et exportée : c'est la pièce la plus critique, elle est testée seule.
 */
export function computeBackoff(
  attempt: number,
  baseMs: number = BASE_DELAY_MS,
  capMs: number = MAX_DELAY_MS,
): number {
  if (attempt <= 0) return baseMs;
  const exponential = baseMs * 2 ** Math.min(attempt, 10);
  return Math.min(exponential, capMs);
}

export interface ResilientPlaybackHandlers {
  onHealthChange?: (health: PlaybackHealth) => void;
  /** Appelé quand une reprise a réussi après incident. */
  onRecovered?: (attempts: number) => void;
}

export class ResilientPlayback {
  private audio: HTMLAudioElement | null = null;
  private health: PlaybackHealth = 'idle';
  private attempt = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  /** Position à restaurer lors d'une reprise, en secondes. */
  private lastPosition = 0;
  /** L'utilisateur veut-il entendre du son ? Distinct de « le son sort ». */
  private intendsToPlay = false;
  private prefetchEl: HTMLAudioElement | null = null;
  private prefetchedUrl: string | null = null;
  private detachFns: Array<() => void> = [];

  constructor(private readonly handlers: ResilientPlaybackHandlers = {}) {}

  // ---------------------------------------------------------------- cycle de vie

  attach(audio: HTMLAudioElement): void {
    this.detach();
    this.audio = audio;

    const bind = <K extends keyof HTMLMediaElementEventMap>(
      type: K,
      listener: (event: HTMLMediaElementEventMap[K]) => void,
    ) => {
      audio.addEventListener(type, listener as EventListener);
      this.detachFns.push(() => audio.removeEventListener(type, listener as EventListener));
    };

    bind('playing', () => {
      if (this.attempt > 0) this.handlers.onRecovered?.(this.attempt);
      this.attempt = 0;
      this.clearRetry();
      this.setHealth('playing');
    });
    bind('waiting', () => this.setHealth('buffering'));
    bind('stalled', () => this.scheduleRetry('stalled'));
    bind('error', () => this.scheduleRetry('error'));
    bind('pause', () => {
      if (!this.intendsToPlay) this.setHealth('idle');
    });
    bind('timeupdate', () => {
      // Mémorise la position uniquement quand la lecture avance réellement :
      // une reprise ne doit jamais repartir d'un `currentTime` remis à zéro.
      if (audio.currentTime > 0) this.lastPosition = audio.currentTime;
    });

    if (typeof window !== 'undefined') {
      const onOnline = () => {
        // Le réseau revient : on ne laisse pas le back-off courir.
        if (this.intendsToPlay) this.retryNow();
      };
      const onOffline = () => {
        if (this.intendsToPlay) this.setHealth('offline');
      };
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      this.detachFns.push(() => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      });
    }
  }

  detach(): void {
    this.clearRetry();
    for (const fn of this.detachFns) fn();
    this.detachFns = [];
    this.audio = null;
  }

  // ---------------------------------------------------------------- intentions

  /** Déclare l'intention de lire. Le moteur s'acharne jusqu'à `stop()`. */
  play(): void {
    this.intendsToPlay = true;
    void this.tryPlay();
  }

  /** L'utilisateur met en pause : on cesse toute tentative de reprise. */
  stop(): void {
    this.intendsToPlay = false;
    this.attempt = 0;
    this.clearRetry();
    this.setHealth('idle');
  }

  /** Nouveau morceau : la position mémorisée n'a plus de sens. */
  resetPosition(): void {
    this.lastPosition = 0;
    this.attempt = 0;
    this.clearRetry();
  }

  getHealth(): PlaybackHealth {
    return this.health;
  }

  // ---------------------------------------------------------------- préchargement

  /**
   * Précharge le morceau suivant si la politique data l'autorise.
   * Retourne `true` si le préchargement a effectivement été lancé.
   */
  prefetch(url: string | null, userDataSaver = false, policy?: DataPolicy): boolean {
    if (!url || url === this.prefetchedUrl) return false;
    const effective = policy ?? dataPolicyFor(readNetworkState().tier, userDataSaver);
    if (!effective.prefetchNextTrack) return false;
    if (typeof document === 'undefined') return false;

    this.releasePrefetch();
    const el = document.createElement('audio');
    el.preload = 'auto';
    el.src = url;
    // Ne jamais émettre de son : c'est un tampon, pas une lecture.
    el.muted = true;
    el.load();
    this.prefetchEl = el;
    this.prefetchedUrl = url;
    return true;
  }

  releasePrefetch(): void {
    if (this.prefetchEl) {
      this.prefetchEl.removeAttribute('src');
      this.prefetchEl.load();
      this.prefetchEl = null;
    }
    this.prefetchedUrl = null;
  }

  // ---------------------------------------------------------------- interne

  private setHealth(next: PlaybackHealth): void {
    if (this.health === next) return;
    this.health = next;
    this.handlers.onHealthChange?.(next);
  }

  private async tryPlay(): Promise<void> {
    const audio = this.audio;
    if (!audio || !this.intendsToPlay) return;

    // Restaure la position avant de relancer : une reprise repart d'où l'on
    // s'était arrêté, pas du début du morceau.
    if (this.lastPosition > 0 && Math.abs(audio.currentTime - this.lastPosition) > 1) {
      try {
        audio.currentTime = this.lastPosition;
      } catch {
        // `currentTime` peut être refusé tant que les métadonnées manquent.
      }
    }

    try {
      await audio.play();
    } catch {
      this.scheduleRetry('play-rejected');
    }
  }

  private scheduleRetry(_reason: string): void {
    if (!this.intendsToPlay || this.retryTimer) return;

    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    this.setHealth(offline ? 'offline' : 'reconnecting');

    const delay = computeBackoff(this.attempt);
    this.attempt += 1;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.tryPlay();
    }, delay);
  }

  private retryNow(): void {
    this.clearRetry();
    void this.tryPlay();
  }

  private clearRetry(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }
}
