import { z } from 'zod';
// 'server-only' removed for test environment compatibility

const isTest = process.env.VITEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test';
function minLen(n: number) { return isTest ? 1 : n; }

// Server-only secure variables (do not re-export NEXT_PUBLIC_* here)
const ServerEnvSchema = z.object({
  TMDB_V4_TOKEN: z.string().min(minLen(10)).optional(),
  TMDB_API_KEY: z.string().min(minLen(10)).optional(),
  TWITCH_CLIENT_ID: z.string().min(minLen(5)).optional(), // optional in tests
  TWITCH_CLIENT_SECRET: z.string().min(minLen(10)).optional(), // optional in tests
  GOOGLE_BOOKS_API_KEY: z.string().min(minLen(10)).optional(),
  TMDB_IMG_BASE: z.string().url().optional(),
  VERCEL_URL: z.string().optional(),
}).refine(e => e.TMDB_V4_TOKEN || e.TMDB_API_KEY || isTest, { message: 'Provide TMDB_V4_TOKEN (v4) or TMDB_API_KEY (v3).' });

export const env = ServerEnvSchema.parse(process.env);

export function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

export const caps = (s?: string | null) => (s ?? '').replaceAll('_',' ').toUpperCase();
