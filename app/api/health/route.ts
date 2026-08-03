import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Sonde de santé — `GET /api/health`.
 *
 * Retourne toujours `status: "ok"` tant que le serveur répond (le front peut
 * s'afficher même sans base). `db` indique séparément l'état Supabase :
 *  - "up"           : la base répond
 *  - "down"         : configurée mais injoignable
 *  - "unconfigured" : variables NEXT_PUBLIC_SUPABASE_* absentes (placeholders)
 */
export async function GET() {
  let db: 'up' | 'down' | 'unconfigured' = 'unconfigured';

  if (isSupabaseConfigured) {
    try {
      const supabase = await createClient();
      // Requête la plus légère possible : un compteur sur une table publique.
      const { error } = await supabase.from('genres').select('id', { count: 'exact', head: true });
      db = error ? 'down' : 'up';
    } catch {
      db = 'down';
    }
  }

  return NextResponse.json(
    { status: 'ok', db, timestamp: new Date().toISOString() },
    { headers: { 'cache-control': 'no-store' } },
  );
}
