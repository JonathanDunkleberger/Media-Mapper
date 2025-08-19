import { describe, it, expect } from 'vitest';
import { processAnime } from '@/server/animeService';
import { MOVIES_FIXTURE, TV_FIXTURE } from './fixtures/anime';

describe('animeService.processAnime', () => {
  it('filters by ANY genre', () => {
    const out = processAnime(MOVIES_FIXTURE, TV_FIXTURE, {
      trending: false,
      selectedGenreIds: [16],
      sort: 'popularity',
      minVotesTopRated: 50,
    });
    expect(out.length).toBeGreaterThan(0);
    for (const it of out) {
      expect(it.genreIds.includes(16)).toBe(true);
    }
  });

  it('dedupes exact duplicates by composite key', () => {
    const out = processAnime(MOVIES_FIXTURE, TV_FIXTURE, {
      trending: false,
      selectedGenreIds: [],
      sort: 'popularity',
      minVotesTopRated: 50,
    });
    const ids = new Set(out.map(i => i.id));
    expect(ids.size).toBe(out.length);
  });

  it('sorts by popularity (desc) with voteAverage as tiebreaker', () => {
    const out = processAnime(MOVIES_FIXTURE, TV_FIXTURE, {
      trending: false,
      selectedGenreIds: [],
      sort: 'popularity',
      minVotesTopRated: 50,
    });
    for (let i = 1; i < out.length; i++) {
      const prev = out[i - 1];
      const curr = out[i];
      const prevKey = [prev.popularity, prev.voteAverage];
      const currKey = [curr.popularity, curr.voteAverage];
      expect(prevKey[0] > currKey[0] || (prevKey[0] === currKey[0] && prevKey[1] >= currKey[1])).toBe(true);
    }
  });

  it('top_rated enforces minVotes and tie-breakers', () => {
    const out = processAnime(MOVIES_FIXTURE, TV_FIXTURE, {
      trending: true,
      selectedGenreIds: [],
      sort: 'top_rated',
      minVotesTopRated: 50,
    });
    expect(out.find(i => i.title.includes('Bravo'))).toBeUndefined();
    for (let i = 1; i < out.length; i++) {
      const a = out[i - 1];
      const b = out[i];
      const cmp =
        b.voteAverage - a.voteAverage ||
        b.voteCount - a.voteCount ||
        b.popularity - a.popularity;
      expect(cmp <= 0).toBe(true);
    }
  });
});
