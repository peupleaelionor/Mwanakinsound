'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Info } from 'lucide-react';
import { flags } from '@mabele/core';
import { Card } from '@/components/ui/card';
import { formatCount } from '@/lib/utils';
import { SupabaseCreditEngine } from './supabase-credit-engine';

/**
 * Solde MwanaCoins + disclaimer.
 *
 * ⚠️ Le disclaimer « sans valeur monétaire » est une exigence du brief (§2.4).
 * Il est rendu inconditionnellement, dans le même composant que le solde :
 * afficher un solde sans son disclaimer est impossible par construction.
 */
export function CoinsCard() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!flags().MWANACOINS_ENABLED) return;
    let active = true;
    void new SupabaseCreditEngine().balance().then((value) => {
      if (active) setBalance(value);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!flags().MWANACOINS_ENABLED) return null;

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-kin text-primary-foreground">
          <Sparkles className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">MwanaCoins</p>
          <p className="font-display text-2xl font-bold tabular-nums">
            {balance === null ? '—' : formatCount(balance)}
          </p>
        </div>
      </div>

      {/* Disclaimer obligatoire — ne jamais retirer (règle §2.4 du brief). */}
      <p className="mt-3 flex gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        <span>
          Les MwanaCoins sont des <strong>points d&apos;engagement social</strong>. Ils n&apos;ont{' '}
          <strong>aucune valeur monétaire</strong> : ils ne peuvent être ni achetés, ni vendus, ni
          échangés contre de l&apos;argent.
        </span>
      </p>
    </Card>
  );
}
