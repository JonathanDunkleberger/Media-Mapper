import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

const originalFetch = global.fetch;

function mockFetch(ok: boolean, body: any, status = 200) {
  (global.fetch as any).mockResolvedValueOnce({
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body))
  });
}

describe('tmdb helpers', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    delete (process as any).env.TMDB_V4_TOKEN;
    delete (process as any).env.TMDB_API_KEY;
    vi.resetModules(); // allow fresh env capture each test
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('posterUrl returns empty string for falsy', async () => {
    const { posterUrl } = await import('@/lib/tmdb.public');
    expect(posterUrl(undefined)).toBe('');
    expect(posterUrl(null as any)).toBe('');
  });

  it('posterUrl builds url for path', async () => {
    const { posterUrl } = await import('@/lib/tmdb.public');
    expect(posterUrl('/abc.jpg','w500')).toBe('https://image.tmdb.org/t/p/w500/abc.jpg');
  });

  it('tmdb fetches with v3 key when provided (X-API-Key header)', async () => {
    (process as any).env.TMDB_API_KEY = 'test123';
    const { tmdb } = await import('@/lib/tmdb.server');
    mockFetch(true, { id: 1 });
    const res = await tmdb('/movie/1');
    expect(res).toEqual({ id: 1 });
    const opts = (global.fetch as any).mock.calls[0][1];
    expect(opts.headers['X-API-Key']).toBe('test123');
  });

  it('tmdb uses bearer when v4 token present', async () => {
    (process as any).env.TMDB_V4_TOKEN = 'tok';
    const { tmdb } = await import('@/lib/tmdb.server');
    mockFetch(true, { id: 2 });
    const res = await tmdb('/movie/2');
    expect(res).toEqual({ id: 2 });
    const opts = (global.fetch as any).mock.calls[0][1];
    expect(opts.headers.Authorization).toContain('Bearer tok');
  });

  it('tmdb throws on non-ok', async () => {
    (process as any).env.TMDB_API_KEY = 'test123';
    const { tmdb } = await import('@/lib/tmdb.server');
    mockFetch(false, 'Bad body', 404);
    await expect(tmdb('/movie/404')).rejects.toThrow(/TMDB 404/);
  });
});

afterAll(() => {
  global.fetch = originalFetch;
});
