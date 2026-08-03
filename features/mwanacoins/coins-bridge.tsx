'use client';

import { useEffect } from 'react';
import { flags, onEngagement } from '@mabele/core';
import { SupabaseCreditEngine } from './supabase-credit-engine';

/**
 * Branche le bus d'engagement sur le `credit-engine`.
 *
 * C'est le seul point de couplage entre le produit et MwanaCoins : aucune
 * feature (lecteur, likes, partage) ne connaît l'existence des points. Retirer
 * ce composant du layout désactive proprement tout le module.
 *
 * Ne rend rien.
 */
export function CoinsBridge() {
  useEffect(() => {
    if (!flags().MWANACOINS_ENABLED) return;
    const engine = new SupabaseCreditEngine();
    return onEngagement((event) => {
      // Fire-and-forget : l'attribution de points ne doit jamais retarder ni
      // interrompre une interaction utilisateur.
      void engine.award(event);
    });
  }, []);

  return null;
}
