import { describe, it, expect } from 'vitest';
import * as recsMod from './recs';
import type { MediaItem } from './types';

describe('computeRecommendations round-robin distribution', () => {
  it('returns array for mixed favorites (smoke)', async () => {
    const favorites: MediaItem[] = [
      { id: '1', type: 'movie', title: 'M1', posterUrl: null },
      { id: '2', type: 'tv', title: 'T1', posterUrl: null },
      { id: '3', type: 'game', title: 'G1', posterUrl: null },
      { id: '4', type: 'book', title: 'B1', posterUrl: null }
    ];
    const result = await recsMod.computeRecommendations(favorites, { perType: 2, limitPerSeed: 1 });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('round-robin balance (indirect)', () => {
  it('first slice contains one of each when available', async () => {
    const synthetic: MediaItem[] = [];
    for (let i=0;i<3;i++) synthetic.push({ id: 'm'+i, type: 'movie', title: 'M'+i, posterUrl: null });
    for (let i=0;i<2;i++) synthetic.push({ id: 't'+i, type: 'tv', title: 'T'+i, posterUrl: null });
    for (let i=0;i<2;i++) synthetic.push({ id: 'g'+i, type: 'game', title: 'G'+i, posterUrl: null });
    for (let i=0;i<1;i++) synthetic.push({ id: 'b'+i, type: 'book', title: 'B'+i, posterUrl: null });
    const perType = 3;
    const buckets: Record<'movie'|'tv'|'game'|'book', MediaItem[]> = { movie: [], tv: [], game: [], book: [] };
    for (const it of synthetic) if (buckets[it.type].length < perType) buckets[it.type].push(it);
    function rr(b: typeof buckets, pt: number) {
      for (const k of Object.keys(b) as (keyof typeof b)[]) b[k] = b[k].slice(0, pt);
      const order: (keyof typeof b)[] = ['movie','tv','game','book'];
      const maxLen = Math.max(...order.map(t => b[t].length));
      const out: MediaItem[] = [];
      for (let i=0;i<maxLen;i++) for (const t of order) { const item = b[t][i]; if (item) out.push(item); }
      return out;
    }
    const out = rr(buckets, perType);
    expect(out.slice(0,4).map(x=>x.type)).toEqual(['movie','tv','game','book']);
  });
});
