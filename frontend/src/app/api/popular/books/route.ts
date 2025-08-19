import { z } from 'zod';
import { booksSearch, GoogleVolumeRaw } from '@/lib/books';
import { mapBooksGoogle } from '@/lib/map';
import { createJsonRoute } from '@/lib/api/route-factory';

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
    const subjects = genresParam.split(',').map(s => s.trim()).filter(Boolean);
    const startIndex = (page - 1) * take;
    const order = mode === 'newest' ? 'newest' : 'relevance';
    const batch1 = await booksSearch(subjects, Math.min(take, 40), startIndex, order) as GoogleVolumeRaw[];
    let combined = batch1;
    if (take > 40) {
      const batch2 = await booksSearch(subjects, take - 40, startIndex + 40, order) as GoogleVolumeRaw[];
      combined = [...batch1, ...batch2];
    }
    return mapBooksGoogle(combined);
  }
});
