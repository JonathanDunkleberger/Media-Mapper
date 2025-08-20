import { z } from 'zod';

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
  if (!isTest && !v.TMDB_V4_TOKEN && !v.TMDB_API_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide TMDB_V4_TOKEN (v4) or TMDB_API_KEY (v3).',
    });
  }
});

export const env = schema.parse(process.env);

// Deprecated: getBaseUrl. Use relative paths for internal API calls.

// Tripwire to ensure this file never ends up in a client bundle.
if (typeof window !== 'undefined') {
  throw new Error('env.server.ts was imported into the client bundle. Fix imports.');
}

export const caps = (s?: string | null) => (s ?? '').replaceAll('_',' ').toUpperCase();
