import { describe, it, expect, beforeEach, vi, afterEach, afterAll } from 'vitest';
import { booksSearch, booksGet, booksSimilar, GoogleVolumeRaw } from '@/lib/books';

// Simple mock for global fetch
const originalFetch = global.fetch;

function mockFetchOnce(ok: boolean, data: any, status = 200) {
  (global.fetch as any).mockResolvedValueOnce({
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
  });
}

describe('books helpers', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('booksSearch builds subject queries from array', async () => {
    mockFetchOnce(true, { items: [{ id: 'a1' }] });
    const res = await booksSearch(['Sci-Fi', ' Drama ']);
    expect(res).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  const url = (global.fetch as any).mock.calls[0][0] as string;
  const decoded = decodeURIComponent(url);
  expect(decoded).toContain('subject:Sci-Fi+subject:Drama');
  });

  it('booksSearch handles single string query', async () => {
    mockFetchOnce(true, { items: [] });
    const res = await booksSearch('harry potter', 5, 0, 'newest');
    expect(res).toEqual([]);
    const url = (global.fetch as any).mock.calls[0][0] as string;
    expect(url).toContain('harry%20potter');
    expect(url).toContain('orderBy=newest');
  });

  it('booksGet returns volume on success', async () => {
    mockFetchOnce(true, { id: 'bk1', volumeInfo: { title: 'T' } });
    const vol = await booksGet('bk1');
    expect(vol?.id).toBe('bk1');
  });

  it('booksGet returns null on fetch error', async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: false, status: 404, text: () => Promise.resolve('NF') });
    const vol = await booksGet('does-not-exist');
    expect(vol).toBeNull();
  });

  it('booksSimilar prefers author search', async () => {
    mockFetchOnce(true, { items: [{ id: 'ax' }] });
    const vol: GoogleVolumeRaw = { id: 'bk', volumeInfo: { authors: ['Jane Doe'], categories: ['Adventure'] } };
    const sims = await booksSimilar(vol, 3);
    expect(sims).toHaveLength(1);
    const url = (global.fetch as any).mock.calls[0][0] as string;
    expect(url).toContain('inauthor%3AJane%20Doe');
  });

  it('booksSimilar falls back to category when no author', async () => {
    mockFetchOnce(true, { items: [{ id: 'cx' }] });
    const vol: GoogleVolumeRaw = { id: 'bk', volumeInfo: { categories: ['Mystery'] } };
    const sims = await booksSimilar(vol, 2);
    expect(sims[0].id).toBe('cx');
    const url = (global.fetch as any).mock.calls[0][0] as string;
    expect(url).toContain('subject%3AMystery');
  });

  it('booksSimilar returns [] when neither author nor category', async () => {
    const vol: GoogleVolumeRaw = { id: 'bk', volumeInfo: { } };
    const sims = await booksSimilar(vol, 2);
    expect(sims).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

afterAll(() => {
  global.fetch = originalFetch;
});
