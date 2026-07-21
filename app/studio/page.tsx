import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { BarChart3, Heart, PlayCircle, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getStudioOverview } from '@/services/studio';
import { StatCard } from '@/features/analytics/stat-card';
import { StreamsChart } from '@/features/analytics/streams-chart';
import { CreateArtistCta } from '@/features/artists/create-artist-cta';
import { UploadTrackDialog } from '@/features/studio/upload-track-dialog';
import { formatCount, formatDuration } from '@/lib/utils';

export const metadata: Metadata = { title: 'Espace artiste' };
export const dynamic = 'force-dynamic';

export default async function StudioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/studio');

  const overview = await getStudioOverview(user.id);

  if (!overview.artist) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 font-display text-2xl font-bold">Espace artiste</h1>
        <p className="mb-6 text-muted-foreground">
          Créez votre profil artiste pour publier votre musique et suivre vos statistiques.
        </p>
        <CreateArtistCta />
      </div>
    );
  }

  const { artist, tracks, totalStreams, totalLikes, last7Days, topCountries } = overview;

  return (
    <div className="mx-auto max-w-screen-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-primary">Espace artiste</p>
          <h1 className="font-display text-2xl font-bold md:text-3xl">{artist.name}</h1>
        </div>
        <UploadTrackDialog artistId={artist.id} />
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Écoutes (30 j)" value={formatCount(totalStreams)} icon={PlayCircle} />
        <StatCard
          label="Auditeurs mensuels"
          value={formatCount(artist.monthly_listeners)}
          icon={Users}
        />
        <StatCard label="J'aime" value={formatCount(totalLikes)} icon={Heart} />
        <StatCard label="Titres" value={String(tracks.length)} icon={BarChart3} />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 font-display text-lg font-semibold">Écoutes · 7 derniers jours</h2>
          <StreamsChart data={last7Days} />
        </div>
        <div>
          <h2 className="mb-3 font-display text-lg font-semibold">Top pays</h2>
          <div className="space-y-2">
            {topCountries.length === 0 && (
              <p className="text-sm text-muted-foreground">Pas encore de données.</p>
            )}
            {topCountries.map((c) => (
              <div
                key={c.country_code ?? 'ZZ'}
                className="flex items-center justify-between text-sm"
              >
                <span>{c.country_code ?? 'Inconnu'}</span>
                <span className="text-muted-foreground">{formatCount(c.streams)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 className="mb-3 font-display text-lg font-semibold">Catalogue</h2>
      <div className="overflow-hidden rounded-xl border border-border">
        {tracks.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">
            Aucun titre publié. Importez votre première chanson.
          </p>
        )}
        {tracks.map((t, i) => (
          <div
            key={t.id}
            className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0"
          >
            <span className="w-6 text-sm text-muted-foreground">{i + 1}</span>
            <span className="flex-1 truncate text-sm font-medium">{t.title}</span>
            <span className="hidden text-xs capitalize text-muted-foreground md:inline">
              {t.status}
            </span>
            <span className="text-sm text-muted-foreground">{formatCount(t.play_count)} ▶</span>
            <span className="hidden w-14 text-right text-xs text-muted-foreground md:inline">
              {formatDuration(t.duration_ms)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
