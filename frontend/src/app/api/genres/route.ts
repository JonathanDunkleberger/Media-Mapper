import { z } from 'zod';
import { createJsonRoute } from '@/lib/api/route-factory';
import { getTmdbMovieGenres, getTmdbTvGenres, getAnimeGenres, getIgdbGenres, getBookSubjects } from '@/lib/genres';

const Query = z.object({ cat: z.string().optional() });

export const GET = createJsonRoute({
  schema: Query,
  cacheSeconds: 86400,
  async run({ query }) {
    switch (query.cat) {
      case 'movie': return await getTmdbMovieGenres();
      case 'tv': return await getTmdbTvGenres();
      case 'anime': return await getAnimeGenres();
      case 'game': return await getIgdbGenres();
      case 'book': return await getBookSubjects();
      default: return [];
    }
  }
});
