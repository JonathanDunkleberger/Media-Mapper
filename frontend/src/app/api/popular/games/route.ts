import { z } from 'zod';
import { fetchJSON } from '@/lib/upstream';
import { env } from '@/lib/env.server';

const Query = z.object({
  take: z.coerce.number().int().min(1).max(100).default(60),
  page: z.coerce.number().int().min(1).max(20).default(1),
  mode: z.enum(['popular','top_rated']).default('popular'),
  genres: z.string().optional(),
});

export const GET = createJsonRoute({
  schema: Query,
  cacheSeconds: 300,
  async run({ query }) {
    const { take, page, mode, genres } = query;
    const offset = (page - 1) * take;
    const whereParts = [ 'first_release_date != null' ];
    if (mode === 'top_rated') whereParts.push('rating_count != null', 'total_rating != null');
    if (genres) whereParts.push(`genres = (${genres})`);
    const whereClause = whereParts.length ? `where ${whereParts.join(' & ')};` : '';
    const sort = mode === 'top_rated' ? 'total_rating desc' : 'rating_count desc';
    const body = `fields name,cover.image_id,first_release_date,total_rating,rating_count,genres; sort ${sort}; ${whereClause} limit ${take}; offset ${offset};`;
    const client = env.TWITCH_CLIENT_ID;
    const token = env.TWITCH_CLIENT_SECRET;
    if (!client || !token) {
      return { ok: false, where: 'igdb', error: 'IGDB credentials missing' };
    }
    const data = await fetchJSON('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': client,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      body,
    }, 'igdb');
    if (!data.ok) return data;
    return (data.data ?? []);
  }
});

export const runtime = "nodejs";
export const revalidate = 0;
