import { z } from 'zod';
import { fetchJSON } from '@/lib/upstream';
import { env } from '@/lib/env.server';

const Query = z.object({
  take: z.coerce.number().int().min(1).max(60).default(60),
  page: z.coerce.number().int().min(1).max(20).default(1),
  mode: z.enum(['popular','top_rated','newest']).default('popular'),
  genres: z.string().optional(),
  subject: z.string().optional(),
});

export const GET = createJsonRoute({
  schema: Query,
  cacheSeconds: 300,
  async run({ query }) {
    const { take, page, mode, genres, subject } = query;
  const genresParam = genres || subject || 'fiction';
  const startIndex = (page - 1) * take;
  const order = mode === 'newest' ? 'newest' : 'relevance';
  const key = env.GOOGLE_BOOKS_API_KEY;
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(genresParam)}&maxResults=${take}&startIndex=${startIndex}&orderBy=${order}&key=${key}`;
  const data = await fetchJSON(url, {}, 'google_books');
  if (!data.ok) return data;
  return (data.data?.items ?? []);
  }
});

export const runtime = "nodejs";
export const revalidate = 0;
