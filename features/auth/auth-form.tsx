'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { env } from '@/lib/env';

const credentialsSchema = z.object({
  email: z.string().email('Adresse e-mail invalide'),
  password: z.string().min(8, 'Au moins 8 caractères'),
});

type Mode = 'signin' | 'signup';

/**
 * Email/password auth with client-side validation. On sign-up, a profile row is
 * created automatically by the `handle_new_user` DB trigger — no extra call.
 */
export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/';

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Champs invalides');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        router.replace(next);
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          ...parsed.data,
          options: { emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${next}` },
        });
        if (error) throw error;
        setNotice('Vérifiez votre boîte mail pour confirmer votre inscription.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="Adresse e-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        required
      />
      <input
        type="password"
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        required
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {notice && <p className="text-sm text-primary">{notice}</p>}

      <Button type="submit" size="lg" disabled={loading}>
        {loading ? '…' : mode === 'signin' ? 'Se connecter' : 'Créer un compte'}
      </Button>

      <button
        type="button"
        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        {mode === 'signin'
          ? 'Pas encore de compte ? Inscrivez-vous'
          : 'Déjà inscrit ? Connectez-vous'}
      </button>
    </form>
  );
}
