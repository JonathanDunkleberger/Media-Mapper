import { test, expect, request } from '@playwright/test';

const DEFAULT = ['movie', 'tv', 'anime', 'game', 'book'] as const;
const CATS = (process.env.CATS?.split(',').map(s => s.trim()).filter(Boolean) ?? DEFAULT) as unknown as typeof DEFAULT;

test.describe('popular API ok', () => {
  for (const cat of CATS) {
    test(`GET /api/popular/${cat} ok:true`, async ({ baseURL }) => {
      const ctx = await request.newContext({ baseURL: baseURL! });
      const res = await ctx.get(`/api/popular/${cat}`, { params: { mode: 'popular', page: 1, take: 1 } });
      expect(res.ok()).toBeTruthy();
      const json: any = await res.json();
      expect(json.ok).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      const item = json.data[0] ?? {};
      const hasPoster = Boolean(item.poster || item.poster_path || item.image_id || (item.imageLinks && item.imageLinks.thumbnail));
      expect(hasPoster, `no poster-ish field in first ${cat} item`).toBe(true);
    });
  }
});
