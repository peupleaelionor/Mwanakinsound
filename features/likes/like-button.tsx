'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/env';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

/**
 * Optimistic like toggle. Reflects the change instantly, then reconciles with
 * Supabase; on failure it rolls back and toasts. Anonymous users are nudged to
 * sign in. Self-contained: fetches its own liked state on mount.
 */
export function LikeButton({
  trackId,
  size = 'md',
  className,
}: {
  trackId: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [ready, setReady] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setReady(true);
      return;
    }
    let active = true;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (active) setReady(true);
        return;
      }
      const { data } = await supabase
        .from('likes')
        .select('track_id')
        .eq('user_id', user.id)
        .eq('track_id', trackId)
        .maybeSingle();
      if (active) {
        setLiked(Boolean(data));
        setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [trackId]);

  async function toggle() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: 'Connectez-vous', description: 'Créez un compte pour aimer des titres.' });
      router.push('/login?next=/');
      return;
    }

    const previous = liked;
    setLiked(!previous); // optimistic

    startTransition(async () => {
      const op = previous
        ? supabase.from('likes').delete().eq('user_id', user.id).eq('track_id', trackId)
        : supabase.from('likes').insert({ user_id: user.id, track_id: trackId });
      const { error } = await op;
      if (error) {
        setLiked(previous); // rollback
        toast({ title: 'Action impossible', description: error.message, variant: 'error' });
      }
    });
  }

  const iconSize = size === 'sm' ? 'size-4' : 'size-5';

  return (
    <button
      onClick={toggle}
      disabled={!ready}
      aria-pressed={liked}
      aria-label={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      className={cn(
        'inline-flex items-center justify-center rounded-full transition-transform active:scale-90',
        className,
      )}
    >
      <Heart
        className={cn(
          iconSize,
          'transition-colors',
          liked ? 'fill-primary text-primary' : 'text-muted-foreground hover:text-foreground',
        )}
      />
    </button>
  );
}
