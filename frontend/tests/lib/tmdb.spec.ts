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

  it('tmdbImage returns null for falsy', async () => {
    const { tmdbImage } = await import('@/lib/tmdb');
    expect(tmdbImage(null)).toBeNull();
    expect(tmdbImage(undefined)).toBeNull();
  });

  it('tmdbImage builds url for path', async () => {
    const { tmdbImage } = await import('@/lib/tmdb');
    expect(tmdbImage('/abc.jpg', 'w500')).toBe('https://image.tmdb.org/t/p/w500/abc.jpg');
  });

  it('tmdbJson throws when no api key envs set', async () => {
    const { tmdbJson } = await import('@/lib/tmdb');
    await expect(tmdbJson('/movie/1')).rejects.toThrow(/TMDB_API_KEY/);
  });

  it('tmdbJson fetches with v3 key when provided', async () => {
    (process as any).env.TMDB_API_KEY = 'test123';
    const { tmdbJson } = await import('@/lib/tmdb');
    mockFetch(true, { id: 1 });
    const res = await tmdbJson('/movie/1');
    expect(res).toEqual({ id: 1 });
    const url = (global.fetch as any).mock.calls[0][0];
    expect(url).toContain('api_key=test123');
  });

  it('tmdbJson uses bearer when v4 token present (no query param)', async () => {
    (process as any).env.TMDB_V4_TOKEN = 'tok';
    const { tmdbJson } = await import('@/lib/tmdb');
    mockFetch(true, { id: 2 });
    const res = await tmdbJson('/movie/2');
    expect(res).toEqual({ id: 2 });
    const url = (global.fetch as any).mock.calls[0][0];
    expect(url).not.toContain('api_key=');
    const opts = (global.fetch as any).mock.calls[0][1];
    expect(opts.headers.Authorization).toContain('Bearer tok');
  });

  it('tmdbJson throws on non-ok', async () => {
    (process as any).env.TMDB_API_KEY = 'test123';
    const { tmdbJson } = await import('@/lib/tmdb');
    mockFetch(false, 'Bad body', 404);
    await expect(tmdbJson('/movie/404')).rejects.toThrow(/TMDB 404/);
  });
});

afterAll(() => {
  global.fetch = originalFetch;
});
