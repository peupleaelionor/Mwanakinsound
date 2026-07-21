import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/env';
import type { Database } from '@/types/database.types';

/**
 * Browser Supabase client (singleton per tab). Uses the anon key; all access
 * is governed by RLS. Safe to import in Client Components.
 */
export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
