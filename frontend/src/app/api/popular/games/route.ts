import { z } from 'zod';
import { igdb, IGDBGameRaw } from '@/lib/igdb';
import { mapGamesIGDB } from '@/lib/map';
import { createJsonRoute } from '@/lib/api/route-factory';

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
    const data = await igdb<IGDBGameRaw>('games', body);
    return mapGamesIGDB(data);
  }
});
