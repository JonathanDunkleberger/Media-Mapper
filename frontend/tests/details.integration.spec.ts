import { describe, it, expect, vi, beforeEach } from 'vitest';
import { zEnrichedDetail } from '@/lib/schemas/details';

vi.mock('@/lib/tmdb', () => ({
  tmdbJson: vi.fn(async (path: string) => {
    if (path.includes('recommendations')) {
      return { results: [{ id: 303, title: 'Rec Movie', poster_path: '/r1.jpg', release_date: '2024-01-01' }] };
    }
    if (path.includes('/movie/')) {
      return { id: 101, title: 'Mock Movie', poster_path: '/mv.jpg', overview: 'Movie overview', genres: [{ name: 'Action' }], runtime: 123, tagline: 'Tag', budget: 1000, revenue: 5000, original_language: 'en', status: 'Released' };
    }
    if (path.includes('/tv/')) {
      return { id: 202, name: 'Mock Show', poster_path: '/tv.jpg', overview: 'Show overview', genres: [{ name: 'Drama' }], episode_run_time: [24], number_of_episodes: 12, tagline: 'ShowTag', original_language: 'ja', status: 'Ended' };
    }
    return {};
  })
}));

vi.mock('@/lib/igdb', () => ({
  igdb: vi.fn(async (_endpoint: string, _body: string) => [
    { id: 777, name: 'Mock Game', first_release_date: Math.floor(Date.now()/1000), cover: { image_id: 'gamecover' }, genres: [{ name: 'RPG' }], summary: 'Game summary', similar_games: [778], platforms: [{ name: 'PC' }] }
  ]),
  igdbCoverUrl: (id?: string) => id ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${id}.jpg` : null
}));

vi.mock('@/lib/books', () => ({
  booksGet: vi.fn(async (id: string) => ({ id, volumeInfo: { title: 'Mock Book', publishedDate: '2020-05-01', imageLinks: { thumbnail: 'https://books.example/tn.jpg' }, description: 'Book desc', categories: ['Sci-Fi'], pageCount: 320, authors: ['Author A'], publisher: 'Pub House', industryIdentifiers: [{ identifier: 'ISBN123' }] } }))
}));

vi.mock('@/lib/image', () => ({ safePosterUrl: (p: string | null | undefined) => p ? `https://image.tmdb.org/t/p/w500${p}` : null }));
vi.mock('@/lib/map', () => ({
  mapGamesIGDB: (games: any[]) => games.map(g => ({ id: g.id, type: 'game', title: g.name, year: new Date(g.first_release_date * 1000).getFullYear(), posterUrl: g.cover?.image_id ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg` : null, sublabel: 'GAME' })),
  mapBooksGoogle: (vols: any[]) => vols.map(v => ({ id: v.id, type: 'book', title: v.volumeInfo?.title || 'Untitled', year: 2020, posterUrl: v.volumeInfo?.imageLinks?.thumbnail || null, sublabel: 'BOOK • 2020' }))
}));

// Import the route after mocks
import * as detailsRoute from '@/app/api/details/[type]/[id]/route';
import { tmdbJson } from '@/lib/tmdb';
import { igdb } from '@/lib/igdb';
import { booksGet } from '@/lib/books';

async function call(type: string, id: string) {
  const res = await detailsRoute.GET(new Request('http://test.local'), { params: { type, id } } as any);
  const json = await res.json();
  return json;
}

describe('/api/details integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns valid movie detail', async () => {
    const json = await call('movie', '101');
    expect(json.item).toBeTruthy();
    expect(() => zEnrichedDetail.parse(json.item)).not.toThrow();
    expect(json.item.type).toBe('movie');
    expect(json.item.title).toBe('Mock Movie');
  expect(tmdbJson).toHaveBeenCalled();
  });

  it('returns valid game detail', async () => {
    const json = await call('game', '777');
    expect(() => zEnrichedDetail.parse(json.item)).not.toThrow();
    expect(json.item.type).toBe('game');
    expect(json.item.title).toBe('Mock Game');
  expect(igdb).toHaveBeenCalled();
  });

  it('returns valid book detail', async () => {
    const json = await call('book', 'bk1');
    expect(() => zEnrichedDetail.parse(json.item)).not.toThrow();
    expect(json.item.type).toBe('book');
    expect(json.item.title).toBe('Mock Book');
  expect(booksGet).toHaveBeenCalled();
  });

  it('handles not found gracefully (game)', async () => {
  (igdb as any).mockResolvedValueOnce([]); // next call returns empty array
    const json = await call('game', '999999');
    expect(json.error).toBe('Not found');
  expect(igdb).toHaveBeenCalled();
  });

  it('returns 500 when tmdbJson rejects for movie', async () => {
    (tmdbJson as any).mockRejectedValueOnce(new Error('TMDB 404'));
    const res = await detailsRoute.GET(new Request('http://test.local'), { params: { type: 'movie', id: '123' } } as any);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/TMDB 404/);
  });

  it('handles igdb failure gracefully (game path)', async () => {
    (igdb as any).mockRejectedValueOnce(new Error('IGDB boom'));
    const res = await detailsRoute.GET(new Request('http://test.local'), { params: { type: 'game', id: '777' } } as any);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/IGDB/);
  });
});
