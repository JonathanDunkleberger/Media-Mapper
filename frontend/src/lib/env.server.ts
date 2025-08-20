import { z } from 'zod';

// Augment global for dev warning flag
declare global {
  // Flag to avoid repeating console warning in dev
  // (var needed for global augmentation semantics)
  var __MM_NO_TMDB_WARNED: boolean | undefined;
}

// Flexible server-only schema: secrets optional individually, but require at least one TMDB credential.
const isTest = process.env.VITEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test';

const schema = z.object({
  TMDB_V4_TOKEN: z.string().min(1).optional(),
  TMDB_API_KEY: z.string().min(1).optional(), // legacy v3 key support (optional)
  TWITCH_CLIENT_ID: z.string().min(1).optional(),
  TWITCH_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_BOOKS_API_KEY: z.string().min(1).optional(),
  TMDB_IMG_BASE: z.string().url().optional(),
  VERCEL_URL: z.string().optional(),
}).superRefine((v, ctx) => {
  const prod = process.env.NODE_ENV === 'production';
  if (prod && !isTest && !v.TMDB_V4_TOKEN && !v.TMDB_API_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide TMDB_V4_TOKEN (v4) or TMDB_API_KEY (v3).',
    });
  } else if (!prod && !v.TMDB_V4_TOKEN && !v.TMDB_API_KEY) {
    // Dev fallback: emit a warning once so dev server keeps running with empty data.
    if (!globalThis.__MM_NO_TMDB_WARNED) {
      // eslint-disable-next-line no-console
      console.warn('[env.server] No TMDB token present; movie/TV data will be empty. Set TMDB_V4_TOKEN or TMDB_API_KEY in .env.local');
      // @ts-ignore
      globalThis.__MM_NO_TMDB_WARNED = true;
    }
  }
});

export const env = schema.parse(process.env);

export function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return '';
}

// Tripwire to ensure this file never ends up in a client bundle.
if (typeof window !== 'undefined') {
  throw new Error('env.server.ts was imported into the client bundle. Fix imports.');
}

export const caps = (s?: string | null) => (s ?? '').replaceAll('_',' ').toUpperCase();
