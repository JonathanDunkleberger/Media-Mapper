import { describe, it, expect } from 'vitest';
import { normalizeMediaData, getImageUrl } from './mediaHelpers';
import type { KnownMedia } from '../types/media';

function base<T extends object>(o: T) { return o as unknown as KnownMedia; }

describe('normalizeMediaData', () => {
  it('normalizes movie with relative poster path', () => {
    const raw = base({ type: 'movie', id: 10, title: 'Inception', poster_path: '/abc123.jpg' });
    const n = normalizeMediaData(raw);
    expect(n.id).toBe(10);
    expect(n.title).toBe('Inception');
    expect(n.imageUrl).toMatch(/image.tmdb.org/);
  });

  it('normalizes book with volumeInfo image links', () => {
    const raw = base({ type: 'book', key: 'bk1', title: 'Dune', volumeInfo: { imageLinks: { thumbnail: 'http://books.googleusercontent.com/dune-thumb' } } });
    const n = normalizeMediaData(raw);
    expect(n.id).toBe('bk1');
    expect(n.imageUrl).toMatch(/^https:\/\//);
  });

  it('normalizes game with cover url upgrade', () => {
    const raw = base({ type: 'game', id: 77, name: 'Halo', cover: { url: '//images.igdb.com/igdb/image/upload/t_thumb/halo.png' } });
    const n = normalizeMediaData(raw);
    expect(n.id).toBe(77);
    expect(n.imageUrl).toMatch(/t_cover_big/);
  });

  it('returns same object if already normalized', () => {
    const pre = normalizeMediaData(base({ type: 'movie', id: 5, title: 'Jaws', poster_path: '/x1.jpg' }));
    const again = normalizeMediaData(pre);
    expect(again).toBe(pre);
  });

  it('falls back gracefully when no image', () => {
    const raw = base({ type: 'book', key: 'noimg', title: 'Mystery Book' });
    const n = normalizeMediaData(raw);
    expect(n.imageUrl).toBeUndefined();
  });
});

describe('getImageUrl', () => {
  it('resolves image from normalized image field', () => {
    const raw = base({ type: 'movie', id: 1, title: 'Test', poster_path: '/img.jpg' });
    const n = normalizeMediaData(raw);
    expect(getImageUrl(n)).toBe(n.imageUrl);
  });
});
