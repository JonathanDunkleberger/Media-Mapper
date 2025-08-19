// Prevent Next.js server-only behavior errors under Vitest by conditional dynamic import
;(async () => { try { await import('server-only'); } catch { /* ignored in test */ }})();
import { env } from './env';

let igdbTokenCache: { token: string; exp: number } | null = null;

async function getIGDBToken(): Promise<string> {
  const now = Date.now();
  if (igdbTokenCache && igdbTokenCache.exp > now + 60_000) return igdbTokenCache.token;
  const clientId = env.TWITCH_CLIENT_ID;
  const clientSecret = env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Missing Twitch credentials');
  const resp = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`, { method: 'POST' });
  if (!resp.ok) throw new Error('Failed IGDB token');
  const json = await resp.json() as { access_token: string; expires_in: number };
  igdbTokenCache = { token: json.access_token, exp: now + json.expires_in * 1000 };
  return json.access_token;
}

export async function igdb<T = unknown>(endpoint: string, body: string): Promise<T[]> {
  const token = await getIGDBToken();
  const clientId = env.TWITCH_CLIENT_ID;
  const resp = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    body
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`IGDB ${endpoint} ${resp.status}: ${txt.slice(0,200)}`);
  }
  return await resp.json() as T[];
}

export function igdbCoverUrl(imageId?: string | null, size: 'cover' | 'screenshot' = 'cover') {
  if (!imageId) return null;
  const tag = size === 'cover' ? 't_cover_big' : 't_screenshot_med';
  return `https://images.igdb.com/igdb/image/upload/${tag}/${imageId}.jpg`;
}

export interface IGDBGameRaw {
  id: number;
  name?: string;
  cover?: { image_id?: string };
  first_release_date?: number; // unix secs
  genres?: { name?: string }[];
  similar_games?: number[];
  summary?: string;
  screenshots?: { image_id?: string }[];
  platforms?: { name?: string }[];
}
