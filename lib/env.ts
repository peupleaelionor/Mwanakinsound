import { z } from 'zod';

/**
 * Fail-fast environment validation.
 * Public vars are validated eagerly (they're inlined at build time).
 * Server-only vars are validated lazily via `serverEnv()` so the client
 * bundle never trips over missing secrets.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_NAME: z.string().default('Mwanakin Sound'),
  NEXT_PUBLIC_R2_PUBLIC_URL: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN: z.string().optional(),
});

// Reference each var explicitly so Next.js inlines them into the client bundle.
const parsed = publicSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_R2_PUBLIC_URL: process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
});

const PLACEHOLDER_URL = 'https://placeholder.supabase.co';

/**
 * Resilient-by-default. If the public vars are present, use them. If not, fall
 * back to inert placeholders and log a warning — the app still renders (empty
 * states) instead of returning HTTP 500. This is deliberate so a fresh Vercel
 * deploy shows the UI before Supabase is configured; once the vars are set, the
 * same code lights up with live data. Data access short-circuits when
 * `isSupabaseConfigured` is false (see services/*), avoiding network hangs.
 */
export const env = parsed.success
  ? parsed.data
  : (() => {
      console.warn(
        '[env] Missing/invalid NEXT_PUBLIC_* vars — running with inert placeholders. ' +
          'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable live data.',
      );
      return publicSchema.parse({
        NEXT_PUBLIC_SUPABASE_URL: PLACEHOLDER_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'placeholder-anon-key',
      });
    })();

/**
 * True when a real Supabase project is configured. Services use this to skip
 * queries (returning empty) rather than firing requests at a placeholder host.
 */
export const isSupabaseConfigured = env.NEXT_PUBLIC_SUPABASE_URL !== PLACEHOLDER_URL;

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  AI_PROVIDER: z.enum(['anthropic', 'openai', 'none']).default('none'),
  ANTHROPIC_API_KEY: z.string().optional(),
});

let cachedServerEnv: z.infer<typeof serverSchema> | null = null;

/** Validate & return server-only env. Throws if called on the client. */
export function serverEnv() {
  if (typeof window !== 'undefined') {
    throw new Error('serverEnv() must not be called in the browser.');
  }
  if (!cachedServerEnv) {
    cachedServerEnv = serverSchema.parse({
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      AI_PROVIDER: process.env.AI_PROVIDER,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    });
  }
  return cachedServerEnv;
}
