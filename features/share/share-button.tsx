'use client';

import { useState } from 'react';
import { Share2, MessageCircle, Link2, Smartphone } from 'lucide-react';
import { emitEngagement } from '@mabele/core';
import { env } from '@/lib/env';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { availableTargets, shareTrack, type ShareTarget } from './deep-link';

const ICONS: Record<ShareTarget['id'], typeof Share2> = {
  native: Share2,
  whatsapp: MessageCircle,
  sms: Smartphone,
  copy: Link2,
};

/**
 * Partage d'un morceau depuis le Studio ou la page artiste.
 *
 * Si le partage natif existe (Android/Chrome, notre cible), on l'utilise
 * directement — un seul geste. Sinon on déplie les canaux locaux.
 * Le partage réussi alimente le bus d'engagement → MwanaCoins.
 */
export function ShareTrackButton({
  trackId,
  artistSlug,
  title,
  artistName,
}: {
  trackId: string;
  artistSlug: string;
  title: string;
  artistName: string;
}) {
  const [open, setOpen] = useState(false);
  const targets = availableTargets();
  const hasNative = targets[0]?.id === 'native';

  async function run(target: ShareTarget['id']) {
    const result = await shareTrack(
      { siteUrl: env.NEXT_PUBLIC_SITE_URL, artistSlug, trackId, title, artistName },
      target,
    );
    if (!result.ok) return;

    emitEngagement('track.shared', trackId, { via: result.via ?? 'unknown' });
    if (result.via === 'copy') {
      toast({ title: 'Lien copié', variant: 'success' });
    }
    setOpen(false);
  }

  // Chemin rapide : un seul bouton quand le partage natif est disponible.
  if (hasNative && !open) {
    return (
      <Button variant="outline" size="sm" onClick={() => run('native')}>
        <Share2 className="size-4" /> Partager
      </Button>
    );
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Share2 className="size-4" /> Partager
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {targets
        .filter((t) => t.id !== 'native')
        .map((t) => {
          const Icon = ICONS[t.id];
          return (
            <Button key={t.id} variant="outline" size="sm" onClick={() => run(t.id)}>
              <Icon className="size-4" /> {t.label}
            </Button>
          );
        })}
    </div>
  );
}
