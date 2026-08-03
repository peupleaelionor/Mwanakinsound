/**
 * Détection de qualité réseau — socle de toute la résilience 2G/Edge.
 *
 * Toute décision coûteuse en data (préchargement, bitrate, images, cache audio)
 * doit passer par ici. Aucune feature ne devine le réseau dans son coin.
 *
 * S'appuie sur la Network Information API quand elle existe (Chrome Android =
 * notre cible principale) et dégrade proprement ailleurs.
 */

export type NetworkTier = 'offline' | 'poor' | 'moderate' | 'good';

export interface NetworkState {
  /** Palier applicatif dérivé — c'est la seule chose que le produit consomme. */
  tier: NetworkTier;
  online: boolean;
  /** Type effectif rapporté par le navigateur ('2g', '3g', '4g'…), si connu. */
  effectiveType: string | null;
  /** Débit descendant estimé en Mb/s, si connu. */
  downlinkMbps: number | null;
  /** Aller-retour estimé en ms, si connu. */
  rttMs: number | null;
  /** L'utilisateur a activé « économiseur de données » au niveau OS/navigateur. */
  saveData: boolean;
}

type NetworkInformation = {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener?: (type: 'change', listener: () => void) => void;
  removeEventListener?: (type: 'change', listener: () => void) => void;
};

function connection(): NetworkInformation | null {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as Navigator & {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  };
  return nav.connection ?? nav.mozConnection ?? nav.webkitConnection ?? null;
}

/**
 * Traduit les signaux bruts en palier applicatif.
 *
 * Le seuil « poor » est calé sur le profil Bandal (~400 kb/s, ~400 ms RTT) :
 * en dessous, on coupe tout ce qui n'est pas indispensable à la lecture.
 */
export function classify(input: {
  online: boolean;
  effectiveType: string | null;
  downlinkMbps: number | null;
  rttMs: number | null;
  saveData: boolean;
}): NetworkTier {
  if (!input.online) return 'offline';
  // Le choix explicite de l'utilisateur prime sur toute mesure.
  if (input.saveData) return 'poor';

  if (input.effectiveType === 'slow-2g' || input.effectiveType === '2g') return 'poor';
  if (input.effectiveType === '3g') return 'moderate';

  // Mesures brutes : ~0,4 Mb/s ou ~400 ms de latence = profil Bandal.
  if (input.downlinkMbps !== null && input.downlinkMbps <= 0.5) return 'poor';
  if (input.rttMs !== null && input.rttMs >= 400) return 'poor';
  if (input.downlinkMbps !== null && input.downlinkMbps < 1.5) return 'moderate';
  if (input.rttMs !== null && input.rttMs >= 200) return 'moderate';

  // Sans information, on ne suppose jamais la fibre : « moderate » par défaut.
  if (input.effectiveType === null && input.downlinkMbps === null) return 'moderate';
  return 'good';
}

export function readNetworkState(): NetworkState {
  const online = typeof navigator === 'undefined' ? true : navigator.onLine;
  const c = connection();
  const raw = {
    online,
    effectiveType: c?.effectiveType ?? null,
    downlinkMbps: typeof c?.downlink === 'number' ? c.downlink : null,
    rttMs: typeof c?.rtt === 'number' ? c.rtt : null,
    saveData: c?.saveData === true,
  };
  return { ...raw, tier: classify(raw) };
}

/** S'abonne aux changements de réseau. Retourne la fonction de désabonnement. */
export function observeNetwork(onChange: (state: NetworkState) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const emit = () => onChange(readNetworkState());
  const c = connection();

  window.addEventListener('online', emit);
  window.addEventListener('offline', emit);
  c?.addEventListener?.('change', emit);

  return () => {
    window.removeEventListener('online', emit);
    window.removeEventListener('offline', emit);
    c?.removeEventListener?.('change', emit);
  };
}

/**
 * Politique de consommation data dérivée du palier réseau.
 * Source unique de vérité : aucune feature ne réinvente ces seuils.
 */
export interface DataPolicy {
  /** Précharger le morceau suivant ? */
  prefetchNextTrack: boolean;
  /** Bitrate audio visé (kb/s). */
  audioBitrateKbps: number;
  /** Charger les pochettes en pleine résolution ? */
  fullResArtwork: boolean;
  /** Autoriser les canaux temps réel (presence, etc.) ? */
  allowRealtime: boolean;
  /** Secondes de tampon à viser avant de considérer la lecture sûre. */
  targetBufferSeconds: number;
}

export function dataPolicyFor(tier: NetworkTier, userDataSaver = false): DataPolicy {
  // Le réglage explicite du profil utilisateur dégrade toujours d'un cran.
  const effective: NetworkTier = userDataSaver && tier !== 'offline' ? 'poor' : tier;

  switch (effective) {
    case 'offline':
      return {
        prefetchNextTrack: false,
        audioBitrateKbps: 64,
        fullResArtwork: false,
        allowRealtime: false,
        targetBufferSeconds: 0,
      };
    case 'poor':
      return {
        prefetchNextTrack: false,
        audioBitrateKbps: 64,
        fullResArtwork: false,
        allowRealtime: false,
        targetBufferSeconds: 20,
      };
    case 'moderate':
      return {
        prefetchNextTrack: true,
        audioBitrateKbps: 128,
        fullResArtwork: false,
        allowRealtime: true,
        targetBufferSeconds: 12,
      };
    case 'good':
      return {
        prefetchNextTrack: true,
        audioBitrateKbps: 256,
        fullResArtwork: true,
        allowRealtime: true,
        targetBufferSeconds: 8,
      };
  }
}
