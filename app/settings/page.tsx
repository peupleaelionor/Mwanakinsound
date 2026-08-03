import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Wifi, Globe } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { DataSaverToggle } from '@/features/settings/data-saver-toggle';
import { SignOutButton } from '@/features/settings/sign-out-button';
import { CoinsCard } from '@/features/mwanacoins/coins-card';
import { LANGUAGES } from '@/lib/constants';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Réglages' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/settings');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const language =
    LANGUAGES.find((l) => l.code === profile?.preferred_language)?.label ?? 'Français';

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-display text-2xl font-bold md:text-3xl">Réglages</h1>

      <div className="space-y-4">
        <CoinsCard />

        <Card className="flex items-center justify-between gap-4 p-4">
          <div className="flex items-start gap-3">
            <Wifi className="mt-0.5 size-5 text-primary" />
            <div>
              <p className="font-medium">Mode économie de données</p>
              <p className="text-sm text-muted-foreground">
                Audio compressé et images allégées — idéal en réseau faible débit.
              </p>
            </div>
          </div>
          <DataSaverToggle initial={profile?.data_saver ?? false} />
        </Card>

        <Card className="flex items-center justify-between gap-4 p-4">
          <div className="flex items-start gap-3">
            <Globe className="mt-0.5 size-5 text-primary" />
            <div>
              <p className="font-medium">Langue</p>
              <p className="text-sm text-muted-foreground">{language}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <p className="mb-1 font-medium">Compte</p>
          <p className="mb-4 text-sm text-muted-foreground">{user.email}</p>
          <SignOutButton />
        </Card>
      </div>
    </div>
  );
}
