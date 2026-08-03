'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { emitEngagement } from '@mabele/core';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { CommentBody } from './hashtag-link';
import { ReactionButton } from './reaction-button';
import type { CommentDTO, CommentTarget } from './types';

const MAX = 280;

/** Fil de commentaires : liste paginée + formulaire de publication. */
export function CommentSection({ target }: { target: CommentTarget }) {
  const router = useRouter();
  const [comments, setComments] = useState<CommentDTO[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [draft, setDraft] = useState('');
  const loadedRef = useRef(false);

  const params = useCallback(() => {
    const p = new URLSearchParams();
    if (target.episodeId) p.set('episodeId', target.episodeId);
    if (target.podcastId) p.set('podcastId', target.podcastId);
    return p;
  }, [target]);

  const load = useCallback(
    async (before?: string) => {
      setLoading(true);
      try {
        const p = params();
        if (before) p.set('before', before);
        const res = await fetch(`/api/comments?${p.toString()}`);
        const data = (await res.json()) as { comments: CommentDTO[]; nextCursor: string | null };
        setComments((prev) => (before ? [...prev, ...data.comments] : data.comments));
        setCursor(data.nextCursor);
      } catch {
        // silencieux : un fil vide vaut mieux qu'une erreur bloquante
      } finally {
        setLoading(false);
      }
    },
    [params],
  );

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    void load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (content.length === 0 || content.length > MAX) return;

    setPosting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...target, content }),
      });
      if (res.status === 401) {
        router.push('/login?next=/podcasts');
        return;
      }
      const data = (await res.json()) as { comment?: CommentDTO; error?: string };
      if (!res.ok || !data.comment) {
        toast({ title: 'Refusé', description: data.error, variant: 'error' });
        return;
      }
      setComments((prev) => [data.comment!, ...prev]);
      setDraft('');
      emitEngagement('comment.posted', data.comment.id);
      toast({ title: 'Commentaire publié', variant: 'success' });
    } finally {
      setPosting(false);
    }
  }

  const remaining = MAX - draft.length;

  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-lg font-semibold">Commentaires</h2>

      <form onSubmit={submit} className="mb-6">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX))}
          placeholder="Votre avis… #hashtag"
          rows={2}
          className="w-full resize-none rounded-lg border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="mt-1 flex items-center justify-between">
          <span
            className={
              remaining < 20 ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'
            }
          >
            {remaining}
          </span>
          <Button type="submit" size="sm" disabled={posting || draft.trim().length === 0}>
            {posting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Publier
          </Button>
        </div>
      </form>

      <div className="space-y-4">
        {comments.map((c) => (
          <article key={c.id} className="flex gap-3">
            <Avatar className="size-8 shrink-0">
              {c.author.avatarUrl && <AvatarImage src={c.author.avatarUrl} alt="" />}
              <AvatarFallback>{c.author.displayName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">@{c.author.username}</p>
              <CommentBody text={c.content} />
              <ReactionButton
                commentId={c.id}
                initialCounts={c.reactions}
                initialMine={c.myReactions}
              />
            </div>
          </article>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-4">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && comments.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Soyez le premier à commenter.
        </p>
      )}

      {cursor && !loading && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" onClick={() => load(cursor)}>
            Charger 10 de plus
          </Button>
        </div>
      )}
    </section>
  );
}
