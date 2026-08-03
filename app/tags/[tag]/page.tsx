import type { Metadata } from 'next';
import { Hash } from 'lucide-react';
import { getCommentsByHashtag } from '@/services/social';
import { CommentBody } from '@/features/social/hashtag-link';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  return { title: `#${decodeURIComponent(tag)}` };
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag).toLowerCase();
  const comments = await getCommentsByHashtag(decoded);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 flex items-center gap-1 font-display text-2xl font-bold">
        <Hash className="size-6 text-primary" />
        {decoded}
      </h1>

      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun commentaire avec ce hashtag pour le moment.
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <article key={c.id} className="rounded-lg border border-border p-3">
              <p className="mb-1 text-xs text-muted-foreground">@{c.author.username}</p>
              <CommentBody text={c.content} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
