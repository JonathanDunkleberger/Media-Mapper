import { z } from 'zod';

const isTest = process.env.VITEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test';
function minLen(n: number) { return isTest ? 1 : n; }

const ServerEnvSchema = z.object({
  TMDB_V4_TOKEN: z.string().min(minLen(10)),
  TWITCH_CLIENT_ID: z.string().min(minLen(5)).optional(),
  TWITCH_CLIENT_SECRET: z.string().min(minLen(10)).optional(),
  GOOGLE_BOOKS_API_KEY: z.string().min(minLen(10)).optional(),
  TMDB_IMG_BASE: z.string().url().optional(),
  VERCEL_URL: z.string().optional(),
});

export const envServer = ServerEnvSchema.parse(process.env);

export function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  if (envServer.VERCEL_URL) return `https://${envServer.VERCEL_URL}`;
  return '';
}

export const caps = (s?: string | null) => (s ?? '').replaceAll('_',' ').toUpperCase();
