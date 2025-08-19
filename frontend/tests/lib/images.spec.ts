import { describe, it, expect } from 'vitest';
import { buildImageUrl, pickPosterPath, pickBackdropPath, pickBestTileImageUrl, tmdbPosterUrl, tmdbBackdropUrl, heroOrOgImage } from '@/lib/images';

describe('images helper', () => {
  it('buildImageUrl joins base + relative with single slash', () => {
    expect(buildImageUrl('https://x/y/', '/foo.jpg')).toBe('https://x/y/foo.jpg');
    expect(buildImageUrl('https://x/y', 'foo.jpg')).toBe('https://x/y/foo.jpg');
  });
  it('buildImageUrl passes through absolute', () => {
    const abs = 'https://cdn.example/img.png';
    expect(buildImageUrl('https://base', abs)).toBe(abs);
  });
  it('pickPosterPath prioritizes poster over backdrop', () => {
    expect(pickPosterPath({ poster_path: '/p.jpg', backdrop_path: '/b.jpg' })).toBe('/p.jpg');
    expect(pickPosterPath({ backdrop_path: '/b.jpg' })).toBe('/b.jpg');
  });
  it('pickBackdropPath prioritizes backdrop over poster', () => {
    expect(pickBackdropPath({ backdrop_path: '/b.jpg', poster_path: '/p.jpg' })).toBe('/b.jpg');
    expect(pickBackdropPath({ poster_path: '/p.jpg' })).toBe('/p.jpg');
  });
  it('pickBestTileImageUrl follows priority chain', () => {
    const chain = pickBestTileImageUrl({ tmdbPoster: null, tmdbBackdrop: null, igdbCover: 'igdb', bookThumb: 'book', placeholder: 'ph' });
    expect(chain).toBe('igdb');
    const chain2 = pickBestTileImageUrl({ tmdbPoster: null, tmdbBackdrop: null, igdbCover: null, bookThumb: null, placeholder: 'ph' });
    expect(chain2).toBe('ph');
  });
  it('tmdbPosterUrl builds proper size segment', () => {
    expect(tmdbPosterUrl('/abc.jpg','w185')).toMatch(/w185\/abc.jpg$/);
  });
  it('tmdbBackdropUrl builds proper size segment', () => {
    expect(tmdbBackdropUrl('/def.jpg','w1280')).toMatch(/w1280\/def.jpg$/);
  });
  it('heroOrOgImage picks backdrop first then poster', () => {
    const hero1 = heroOrOgImage({ backdrop_path: '/b.jpg', poster_path: '/p.jpg' });
    expect(hero1).toMatch(/b.jpg$/);
    const hero2 = heroOrOgImage({ poster_path: '/p.jpg' });
    expect(hero2).toMatch(/p.jpg$/);
    const hero3 = heroOrOgImage({ });
    expect(hero3).toBeNull();
  });
});
