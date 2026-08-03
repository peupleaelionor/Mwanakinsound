'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Point d'entrée de l'import de titre, chargé **au clic**.
 *
 * Le dialogue d'upload (Radix Dialog + logique de validation) ne concerne qu'un
 * artiste qui publie. Un artiste qui vient seulement consulter ses statistiques
 * ne doit pas payer ce code en données mobiles.
 *
 * Le bouton visible est rendu immédiatement : aucune latence perçue, le chunk
 * arrive pendant que l'utilisateur lit le titre du dialogue.
 */
const UploadTrackDialog = dynamic(
  () => import('./upload-track-dialog').then((m) => m.UploadTrackDialog),
  { ssr: false },
);

export function UploadTrackLauncher({ artistId }: { artistId: string }) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <Button onClick={() => setArmed(true)}>
        <Upload className="size-4" /> Importer un titre
      </Button>
    );
  }

  return <UploadTrackDialog artistId={artistId} autoOpen />;
}
