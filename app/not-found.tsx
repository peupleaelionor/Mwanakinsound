import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center text-center">
      <p className="text-gradient-kin font-display text-6xl font-bold">404</p>
      <h1 className="mt-4 font-display text-xl font-semibold">Page introuvable</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Cette page n&apos;existe pas ou a été déplacée.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Retour à l&apos;accueil</Link>
      </Button>
    </div>
  );
}
