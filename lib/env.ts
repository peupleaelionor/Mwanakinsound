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

/**
 * In production the vars MUST be present — a misconfigured deploy should fail
 * loudly. During local builds / CI without credentials we fall back to inert
 * placeholders so `next build`, typecheck, and tests can run. The app won't be
 * able to reach Supabase with placeholders, which is the intended, obvious
 * failure mode for a misconfigured environment.
 */
export const env = parsed.success
  ? parsed.data
  : (() => {
      // Allow placeholders during `next build` (page-data collection has no
      // secrets) and in dev, but fail loudly at real production runtime.
      const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
      if (process.env.NODE_ENV === 'production' && !isBuildPhase) {
        throw new Error(
          `Invalid environment variables:\n${parsed.error.issues
            .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
            .join('\n')}`,
        );
      }
      console.warn(
        '[env] Missing NEXT_PUBLIC_* vars — using inert placeholders. Set them in .env.local.',
      );
      return publicSchema.parse({
        NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'placeholder-anon-key',
      });
    })();

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
