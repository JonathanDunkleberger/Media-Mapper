// server-only removed for test compatibility (handled via env validation)
import { envServer } from '@/lib/env.server';
import { fetchJSON, HttpError } from './http';
import { getIgdbToken } from './igdb-token';

// Token retrieval handled by getIgdbToken (memory cache or KV alternative)

export async function igdb<T = unknown>(endpoint: string, body: string): Promise<T[]> {
  const token = await getIgdbToken();
  if (!token) throw new Error('IGDB token missing');
  if (!envServer.TWITCH_CLIENT_ID || !envServer.TWITCH_CLIENT_SECRET) {
    // Fail clearly (should be validated at process start, but guards here for tests)
    throw new Error('Twitch credentials missing');
  }
  const headers: Record<string, string> = {
    'Client-ID': envServer.TWITCH_CLIENT_ID,
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json'
  };
  try {
    return await fetchJSON<T[]>(`https://api.igdb.com/v4/${endpoint}`, {
      method: 'POST',
      headers,
      body,
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
