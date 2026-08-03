import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { BadgeCheck, Mic2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Section } from '@/components/section';
import { TrackShelf } from '@/components/track-shelf';
import { toTrackCards } from '@/lib/map-tracks';
import { LiveListenersLazy } from '@/features/realtime/live-listeners-lazy';
import { formatCount } from '@/lib/utils';
import type { TrackWithArtist } from '@/types/domain';

export const dynamic = 'force-dynamic';

const TRACK_WITH_ARTIST = '*, artist:artists!inner(id, name, slug, verified)';

async function getArtist(slug: string) {
  const supabase = await createClient();
  const { data: artist } = await supabase
    .from('artists')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (!artist) return null;

  const { data: tracks } = await supabase
    .from('tracks')
    .select(TRACK_WITH_ARTIST)
    .eq('artist_id', artist.id)
    .eq('status', 'published')
    .order('play_count', { ascending: false })
    .limit(30);

  return { artist, tracks: (tracks ?? []) as unknown as TrackWithArtist[] };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getArtist(slug);
  return { title: result?.artist.name ?? 'Artiste' };
}

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getArtist(slug);
  if (!result) notFound();
  const { artist, tracks } = result;

  return (
    <div className="mx-auto max-w-screen-2xl">
      <div className="relative mb-6 flex flex-col items-center gap-4 overflow-hidden rounded-2xl border border-border p-8 text-center md:flex-row md:text-left">
        {artist.cover_url && (
          <Image src={artist.cover_url} alt="" fill className="object-cover opacity-20" />
        )}
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full bg-secondary">
          {artist.avatar_url ? (
            <Image
              src={artist.avatar_url}
              alt={artist.name}
              fill
              sizes="112px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Mic2 className="size-10" />
            </div>
          )}
        </div>
        <div className="relative">
          <h1 className="flex items-center justify-center gap-2 font-display text-3xl font-bold md:justify-start md:text-4xl">
            {artist.name}
            {artist.verified && <BadgeCheck className="size-6 text-primary" />}
          </h1>
          <div className="mt-2 flex items-center justify-center gap-3 md:justify-start">
            <p className="text-sm text-muted-foreground">
              {formatCount(artist.monthly_listeners)} auditeurs mensuels
              {artist.city ? ` · ${artist.city}` : ''}
            </p>
            <LiveListenersLazy artistId={artist.id} />
          </div>
          {(artist.ai_bio || artist.bio) && (
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              {artist.bio || artist.ai_bio}
            </p>
          )}
        </div>
      </div>

      <Section title="Titres populaires">
        <TrackShelf tracks={toTrackCards(tracks)} />
      </Section>
    </div>
  );
}
