// IGDB OAuth token fetcher (server-only)
import { env } from '@/lib/env.server';

let cache: { token: string; exp: number } | null = null;

export async function getIgdbToken(): Promise<string> {
  const now = Date.now();
  if (cache && cache.exp > now + 60_000) return cache.token;

  const body = new URLSearchParams({
  client_id: env.TWITCH_CLIENT_ID || '',
  client_secret: env.TWITCH_CLIENT_SECRET || '',
    grant_type: 'client_credentials',
  });

  const r = await fetch('https://id.twitch.tv/oauth2/token', { method: 'POST', body });
  if (!r.ok) throw new Error(`twitch token failed: ${r.status}`);
  const j = (await r.json()) as { access_token: string; expires_in: number };

  cache = { token: j.access_token, exp: now + j.expires_in * 1000 };
  return cache.token;
}
