import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { AuthForm } from '@/features/auth/auth-form';
import { APP_NAME } from '@/lib/constants';

export const metadata: Metadata = { title: 'Connexion' };

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-sm flex-col justify-center">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-kin font-display text-lg font-bold text-primary-foreground">
          M
        </div>
        <span className="font-display text-xl font-semibold">{APP_NAME}</span>
      </Link>
      <h1 className="font-display text-2xl font-bold">Bienvenue</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Connectez-vous ou créez un compte pour écouter et soutenir les artistes.
      </p>
      <Suspense fallback={<div className="h-64" />}>
        <AuthForm />
      </Suspense>
    </div>
  );
}
