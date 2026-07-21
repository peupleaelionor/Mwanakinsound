'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

/**
 * Africa-first data-saver switch. Persists to profile.data_saver; the player &
 * image loaders read this to serve lower-bitrate audio and lighter assets.
 */
export function DataSaverToggle({ initial }: { initial: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const next = !on;
    setOn(next);
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ data_saver: next })
        .eq('id', user.id);
      if (error) {
        setOn(!next);
        toast({ title: 'Échec', description: error.message, variant: 'error' });
      } else {
        toast({
          title: next ? 'Mode économie activé' : 'Mode économie désactivé',
          variant: 'success',
        });
        router.refresh();
      }
    }
    setSaving(false);
  }

  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={toggle}
      disabled={saving}
      className={cn(
        'relative h-7 w-12 shrink-0 rounded-full transition-colors',
        on ? 'bg-primary' : 'bg-muted',
      )}
    >
      <span
        className={cn(
          'absolute top-1 size-5 rounded-full bg-white transition-transform',
          on ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
}
