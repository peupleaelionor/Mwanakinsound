'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    await createClient().auth.signOut();
    router.replace('/');
    router.refresh();
  }
  return (
    <Button variant="outline" onClick={signOut}>
      <LogOut className="size-4" /> Se déconnecter
    </Button>
  );
}
