import { NextResponse, type NextRequest } from 'next/server';
import { search } from '@/services/search';
import { toPlayable } from '@/lib/audio-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Lightweight JSON search endpoint powering the ⌘K command palette.
 * Returns compact artist & track results (tracks pre-resolved to playable form).
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? '';
  if (q.trim().length < 2) {
    return NextResponse.json({ artists: [], tracks: [] });
  }

  const { artists, tracks } = await search(q);

  return NextResponse.json({
    artists: artists.slice(0, 5).map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      avatarUrl: a.avatar_url,
      verified: a.verified,
    })),
    tracks: tracks
      .slice(0, 6)
      .map((t) => toPlayable(t))
      .filter((t): t is NonNullable<typeof t> => t !== null),
  });
}
