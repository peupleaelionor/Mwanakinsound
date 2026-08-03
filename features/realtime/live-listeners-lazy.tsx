'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { dataPolicyFor, flags, readNetworkState } from '@mabele/core';

/**
 * Chargement conditionnel du compteur d'auditeurs en direct.
 *
 * Deux raisons de ne pas l'embarquer dans le bundle initial :
 *  1. Il tire tout le client Realtime de Supabase — plusieurs dizaines de ko
 *     que l'utilisateur de Bandalungwa paierait avant d'entendre une note.
 *  2. La politique data coupe le temps réel en 2G/Edge et en mode économie :
 *     ce code n'a alors *aucune* raison d'être téléchargé.
 *
 * Résultat : sur réseau dégradé, le module n'est jamais demandé.
 */
const LiveListeners = dynamic(() => import('./live-listeners').then((m) => m.LiveListeners), {
  ssr: false,
});

export function LiveListenersLazy({ artistId }: { artistId: string }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!flags().REALTIME_ENABLED) return;
    // Décidé côté client : le serveur ne connaît pas la qualité du lien.
    setAllowed(dataPolicyFor(readNetworkState().tier).allowRealtime);
  }, []);

  if (!allowed) return null;
  return <LiveListeners artistId={artistId} />;
}
