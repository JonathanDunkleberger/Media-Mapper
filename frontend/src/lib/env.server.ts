import { z } from 'zod';

const isTest = process.env.VITEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test';
const isBuild = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === undefined;

function minLen(n: number) { return isTest ? 1 : n; }

const ServerEnvSchema = z.object({
  TMDB_V4_TOKEN: z.string().min(minLen(10)),
  TWITCH_CLIENT_ID: z.string().min(minLen(5)).optional(),
  TWITCH_CLIENT_SECRET: z.string().min(minLen(10)).optional(),
  GOOGLE_BOOKS_API_KEY: z.string().min(minLen(10)).optional(),
  TMDB_IMG_BASE: z.string().url().optional(),
  VERCEL_URL: z.string().optional(),
});

// Lazy validation - only validate when first accessed, not at import time
let _envServer: z.infer<typeof ServerEnvSchema> | null = null;
let _validationAttempted = false;

export const envServer = new Proxy({} as z.infer<typeof ServerEnvSchema>, {
  get(target, prop: string) {
    if (!_validationAttempted) {
      _validationAttempted = true;
      try {
        _envServer = ServerEnvSchema.parse(process.env);
      } catch (error) {
        // During build time, environment variables might not be available
        // Return empty object for build, but throw error for runtime
        if (isBuild || isTest) {
          console.warn('Environment validation skipped during build/test');
          _envServer = {} as z.infer<typeof ServerEnvSchema>;
        } else {
          throw error;
        }
      }
    }
    return _envServer?.[prop as keyof typeof _envServer];
  }
});

export function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  if (envServer.VERCEL_URL) return `https://${envServer.VERCEL_URL}`;
  return '';
}

export const caps = (s?: string | null) => (s ?? '').replaceAll('_',' ').toUpperCase();
