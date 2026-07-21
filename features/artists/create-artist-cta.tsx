'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { slugify } from '@/lib/utils';

/**
 * Minimal artist onboarding. Creates the artist row (RLS ensures owner_id =
 * the caller) and promotes the profile role to 'artist'.
 */
export function CreateArtistCta() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (name.trim().length < 2) {
      setError('Le nom doit contenir au moins 2 caractères.');
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/login?next=/studio');
      return;
    }

    const slug = `${slugify(name)}-${user.id.slice(0, 6)}`;
    const { error: insertError } = await supabase
      .from('artists')
      .insert({ owner_id: user.id, name: name.trim(), slug });
    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }
    await supabase.from('profiles').update({ role: 'artist' }).eq('id', user.id);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-5">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom d'artiste"
        className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={handleCreate} disabled={loading} size="lg">
        {loading ? '…' : 'Créer mon profil artiste'}
      </Button>
    </div>
  );
}
