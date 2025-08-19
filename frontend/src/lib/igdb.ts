// Prevent Next.js server-only behavior errors under Vitest by conditional dynamic import
;(async () => { try { await import('server-only'); } catch { /* ignored in test */ }})();
import { envServer } from '@/lib/env-server';
import { fetchJSON, HttpError } from './http';
import { getIgdbToken } from './igdb-token';

// Token retrieval handled by getIgdbToken (memory cache or KV alternative)

export async function igdb<T = unknown>(endpoint: string, body: string): Promise<T[]> {
  const token = await getIgdbToken();
  const clientId = envServer.TWITCH_CLIENT_ID;
  try {
    return await fetchJSON<T[]>(`https://api.igdb.com/v4/${endpoint}`, {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      body
    });
  } catch (e) {
    if (e instanceof HttpError) throw new Error(`IGDB ${endpoint} ${e.status}: ${e.body}`);
    throw e;
  }
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
