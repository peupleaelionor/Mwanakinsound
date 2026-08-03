'use client';

import { useState } from 'react';
import { Share2, MessageCircle, Smartphone, Link2 } from 'lucide-react';
import { emitEngagement } from '@mabele/core';
import { env } from '@/lib/env';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  buildShareMessage,
  canShareNatively,
  smsUrl,
  whatsappUrl,
} from '@/features/share/deep-link';

/**
 * Partage d'un épisode / série via deep-links légers (WhatsApp, SMS, copie).
 * Journalise le partage côté serveur (`/api/shares`) et alimente l'engagement.
 *
 * Réutilise les primitives de `features/share/deep-link` — un seul endroit
 * décide de la forme des liens et des messages.
 */
export function ShareModal({
  episodeId,
  podcastId,
  slug,
  title,
  subtitle,
}: {
  episodeId?: string;
  podcastId?: string;
  slug: string;
  title: string;
  subtitle: string;
}) {
  const [open, setOpen] = useState(false);
  const url = `${env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '')}/podcasts/${encodeURIComponent(slug)}`;
  const message = buildShareMessage({
    title,
    artistName: subtitle,
    url,
    template: 'Écoute « {title} » de {artist} sur Mwanakin Sound',
  });

  async function record(via: string) {
    emitEngagement('track.shared', episodeId ?? podcastId ?? slug, { via, kind: 'podcast' });
    try {
      await fetch('/api/shares', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ episodeId, podcastId, shareLink: url }),
      });
    } catch {
      // journalisation best-effort : ne bloque jamais le partage
    }
  }

  async function nativeShare() {
    if (!canShareNatively()) return;
    try {
      await navigator.share({ title, text: message, url });
      await record('native');
      setOpen(false);
    } catch {
      /* annulé */
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            // Sur mobile compatible, on court-circuite la modale : un seul geste.
            if (canShareNatively()) {
              e.preventDefault();
              void nativeShare();
            }
          }}
        >
          <Share2 className="size-4" /> Partager
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Partager</DialogTitle>
          <DialogDescription className="truncate">{title}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <a
            href={whatsappUrl(message)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => record('whatsapp')}
            className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm hover:bg-secondary"
          >
            <MessageCircle className="size-5 text-muted-foreground" /> WhatsApp
          </a>
          <a
            href={smsUrl(message)}
            onClick={() => record('sms')}
            className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm hover:bg-secondary"
          >
            <Smartphone className="size-5 text-muted-foreground" /> SMS
          </a>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                await record('copy');
                toast({ title: 'Lien copié', variant: 'success' });
              } catch {
                /* clipboard indisponible */
              }
            }}
            className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-left text-sm hover:bg-secondary"
          >
            <Link2 className="size-5 text-muted-foreground" /> Copier le lien
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
