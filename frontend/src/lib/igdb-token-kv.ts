// IGDB OAuth token fetcher with KV cache (server-only)
// Optional Vercel KV-backed IGDB token cache.
// Only import this if @vercel/kv is installed & configured.
// @ts-ignore - optional dep
import { kv } from '@vercel/kv';
import { env } from '@/lib/env.server';

const KEY = 'igdb:oauth';

export async function getIgdbTokenKV(): Promise<string> {
  const now = Date.now();
  try {
    const hit = await kv.hgetall<{ token: string; exp: number }>(KEY);
    if (hit && hit.exp > now + 60_000) return hit.token;
  } catch {
    // ignore kv errors
  }

  const body = new URLSearchParams({
  client_id: env.TWITCH_CLIENT_ID || '',
  client_secret: env.TWITCH_CLIENT_SECRET || '',
    grant_type: 'client_credentials',
  });
  const r = await fetch('https://id.twitch.tv/oauth2/token', { method: 'POST', body });
  if (!r.ok) throw new Error(`twitch token failed: ${r.status}`);
  const j = (await r.json()) as { access_token: string; expires_in: number };
  const token = j.access_token;
  const exp = now + j.expires_in * 1000;
  try {
    await kv.hset(KEY, { token, exp });
    await kv.expireat(KEY, Math.floor(exp / 1000));
  } catch {
    // swallow kv write errors
  }
  return token;
}
