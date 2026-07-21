'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/env';
import { formatCount } from '@/lib/utils';

/**
 * Live presence counter using Supabase Realtime. Every visitor on an artist
 * page joins a presence channel; the badge shows how many are there right now —
 * a real-time social signal streaming platforms typically don't surface.
 */
export function LiveListeners({ artistId }: { artistId: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    const channel = supabase.channel(`artist:${artistId}`, {
      config: { presence: { key: crypto.randomUUID() } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        setCount(Object.keys(channel.presenceState()).length);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void channel.track({ online_at: Date.now() });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [artistId]);

  if (count <= 0) return null;

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-primary" />
      </span>
      {formatCount(count)} à l&apos;écoute
    </motion.span>
  );
}
