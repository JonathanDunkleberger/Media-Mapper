;(async () => { try { await import('server-only'); } catch { /* ignored */ }})();

import { env } from './env';
import { fetchJSON, HttpError } from './http';
const GOOGLE_KEY = env.GOOGLE_BOOKS_API_KEY;

export interface GoogleVolumeRaw {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    categories?: string[];
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
}

async function gjson<T>(url: string): Promise<T> {
  const started = Date.now();
  try {
    const result = await fetchJSON<T>(url, { next: { revalidate: 3600 } });
    const elapsed = Date.now() - started;
    // if (elapsed > 2000) {
    //   console.warn(`[gjson] Slow Google Books request (${elapsed}ms): ${url}`);
    // }
    return result;
  } catch (e) {
    // if ((e as any).name === 'AbortError') {
    //   console.error(`[gjson] Timeout: ${url}`);
    // }
    if (e instanceof HttpError) throw new Error(`Books ${e.status}: ${e.body}`);
    throw e;
  }
}

export async function booksSearch(q: string | string[], max = 10, startIndex = 0, orderBy?: 'relevance' | 'newest'): Promise<GoogleVolumeRaw[]> {
  const qStr = Array.isArray(q) ? q.map(s => s.trim()).filter(Boolean).map(s => `subject:${s}`).join('+') : q;
  const keyPart = GOOGLE_KEY ? `&key=${GOOGLE_KEY}` : '';
  const orderPart = orderBy ? `&orderBy=${orderBy}` : '';
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(qStr)}&maxResults=${max}&startIndex=${startIndex}${orderPart}${keyPart}`;
  const data = await gjson<{ items?: GoogleVolumeRaw[] }>(url);
  return data.items ?? [];
}

export async function booksGet(id: string): Promise<GoogleVolumeRaw | null> {
  const keyPart = GOOGLE_KEY ? `?key=${GOOGLE_KEY}` : '';
  try {
    return await gjson<GoogleVolumeRaw>(`https://www.googleapis.com/books/v1/volumes/${id}${keyPart}`);
  } catch { return null; }
}

export async function booksSimilar(volume: GoogleVolumeRaw, limit = 10): Promise<GoogleVolumeRaw[]> {
  const vi = volume.volumeInfo;
  if (!vi) return [];
  const author = vi.authors?.[0];
  if (author) {
  try { return await booksSearch(`inauthor:${author}`, limit); } catch {}
  }
  const cat = vi.categories?.[0];
  if (cat) {
  try { return await booksSearch(`subject:${cat}`, limit); } catch {}
  }
  return [];
}
