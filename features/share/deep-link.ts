/**
 * Deep links de partage — conçus pour WhatsApp et SMS, les deux canaux réels
 * de circulation de la musique en RDC.
 *
 * Principe de sobriété : le lien partagé est le plus court possible et ne
 * transporte aucun paramètre de tracking. Moins d'octets dans le message, moins
 * d'octets à l'ouverture, aucun tiers à contacter (règle §2.2 du brief).
 *
 * Module pur : aucune dépendance DOM, entièrement testable.
 */

export interface ShareTarget {
  id: 'native' | 'whatsapp' | 'sms' | 'copy';
  label: string;
}

export interface TrackShareInput {
  siteUrl: string;
  artistSlug: string;
  trackId: string;
  title: string;
  artistName: string;
}

/**
 * Construit l'URL canonique d'un morceau.
 * Forme volontairement minimale : `/artist/{slug}?t={id}` — pas de campagne,
 * pas d'identifiant de session, rien qui gonfle le message.
 */
export function buildTrackDeepLink(input: {
  siteUrl: string;
  artistSlug: string;
  trackId: string;
}): string {
  const base = input.siteUrl.replace(/\/+$/, '');
  return `${base}/artist/${encodeURIComponent(input.artistSlug)}?t=${encodeURIComponent(input.trackId)}`;
}

/** Message de partage : une ligne, puis le lien. Court = moins cher à envoyer. */
export function buildShareMessage(input: {
  title: string;
  artistName: string;
  url: string;
  template?: string;
}): string {
  const template = input.template ?? 'Écoute {title} de {artist} sur Mwanakin Sound';
  const headline = template.replace('{title}', input.title).replace('{artist}', input.artistName);
  return `${headline}\n${input.url}`;
}

/** Lien `wa.me` — ouvre WhatsApp sans passer par un intermédiaire. */
export function whatsappUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Lien `sms:` — dernier recours, mais le plus universel : fonctionne sans
 * data, y compris sur un téléphone hors couverture internet.
 */
export function smsUrl(message: string): string {
  return `sms:?&body=${encodeURIComponent(message)}`;
}

/** Le navigateur sait-il partager nativement ? */
export function canShareNatively(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

/**
 * Cibles disponibles, dans l'ordre de préférence.
 * Le partage natif absorbe WhatsApp quand il est présent ; sinon on expose les
 * canaux explicitement.
 */
export function availableTargets(): ShareTarget[] {
  const targets: ShareTarget[] = [];
  if (canShareNatively()) targets.push({ id: 'native', label: 'Partager' });
  targets.push({ id: 'whatsapp', label: 'WhatsApp' });
  targets.push({ id: 'sms', label: 'SMS' });
  targets.push({ id: 'copy', label: 'Copier le lien' });
  return targets;
}

export interface ShareResult {
  ok: boolean;
  /** Canal effectivement utilisé — utile pour l'attribution d'engagement. */
  via: ShareTarget['id'] | null;
}

/**
 * Exécute le partage. Ne lève jamais : un partage annulé par l'utilisateur est
 * un cas normal, pas une erreur.
 */
export async function shareTrack(
  input: TrackShareInput,
  target: ShareTarget['id'],
  messageTemplate?: string,
): Promise<ShareResult> {
  const url = buildTrackDeepLink(input);
  const message = buildShareMessage({
    title: input.title,
    artistName: input.artistName,
    url,
    template: messageTemplate,
  });

  try {
    switch (target) {
      case 'native': {
        if (!canShareNatively()) return { ok: false, via: null };
        await navigator.share({ title: input.title, text: message, url });
        return { ok: true, via: 'native' };
      }
      case 'whatsapp':
        window.open(whatsappUrl(message), '_blank', 'noopener,noreferrer');
        return { ok: true, via: 'whatsapp' };
      case 'sms':
        window.location.href = smsUrl(message);
        return { ok: true, via: 'sms' };
      case 'copy': {
        await navigator.clipboard.writeText(url);
        return { ok: true, via: 'copy' };
      }
    }
  } catch {
    // Annulation utilisateur ou API indisponible : silencieux.
    return { ok: false, via: null };
  }
}
