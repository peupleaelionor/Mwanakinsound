'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'mwanakin-install-dismissed';

/**
 * Native PWA install prompt. Captures `beforeinstallprompt`, shows a discreet
 * banner, and remembers dismissal. Critical for the Android-majority audience.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, '1');
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-24 z-[90] mx-auto flex max-w-sm items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-lg md:bottom-28 md:left-auto md:right-6">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-kin text-primary-foreground">
        <Download className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Installer Mwanakin Sound</p>
        <p className="text-xs text-muted-foreground">Accès rapide, hors-ligne, sans app store.</p>
      </div>
      <Button size="sm" onClick={install}>
        Installer
      </Button>
      <button onClick={dismiss} aria-label="Fermer" className="text-muted-foreground">
        <X className="size-4" />
      </button>
    </div>
  );
}
