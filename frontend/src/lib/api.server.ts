import 'server-only';
import { env } from '@/lib/env.server';
import { envClient } from '@/lib/env.client';

export function internalBaseUrlServer(): string {
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return envClient.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}
