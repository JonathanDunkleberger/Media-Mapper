'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import MediaTile from '@/components/MediaTile';
import type { MediaItem } from '@/lib/types';
import FilterBar, { GenreOpt, Mode } from '@/components/FilterBar';
import { useSearchParams, useRouter } from 'next/navigation';
import SkeletonTile from '@/components/SkeletonTile';
import { track } from '@/lib/track';
import { fetchInternalAPI } from '@/lib/api';

const PAGE_SIZE = 60;
const MAX_PAGES = 5;

export type BrowseCat = 'movie' | 'tv' | 'game' | 'book' | 'anime';

// Exponential backoff with jitter helper
async function retryFetch<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); } catch (e) {
      lastErr = e;
      if ((e as Error).name === 'AbortError') throw e; // don't retry aborted
      if (i < attempts - 1) {
        const base = 250 * Math.pow(2, i); // 250, 500, 1000
        const delay = base + Math.random() * base * 0.5; // jitter 50%
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

export default function BrowseClient({ cat }: { cat: BrowseCat }) {
  const sp = useSearchParams();
  const router = useRouter();
  const modeParam = (sp?.get('mode') as Mode) || 'popular';
  const genreParams = sp ? sp.getAll('genre') : [];
  const [mode, setMode] = useState<Mode>(modeParam);
  const [genres, setGenres] = useState<string[]>(genreParams);
  const [allGenres, setAllGenres] = useState<GenreOpt[]>([]);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [prefetching, setPrefetching] = useState(false);
  const [prefetched, setPrefetched] = useState<MediaItem[] | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAddedCount, setLastAddedCount] = useState<number>(0);
  const abortRef = useRef<AbortController | null>(null);
  const loadMoreBtnRef = useRef<HTMLButtonElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // track column count for skeleton placeholders (avoid jank) - coarse breakpoints
  const [cols, setCols] = useState(2);
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      if (w >= 1280) return 7; // xl
      if (w >= 1024) return 6; // lg
      if (w >= 768) return 4;  // md
      if (w >= 640) return 3;  // sm
      return 2;                // base
    };
    const apply = () => setCols(calc());
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);

  // reset when cat changes
  useEffect(() => { setItems([]); setPage(1); setDone(false); setError(null); setPrefetched(null); }, [cat]);

  // sync URL when filters change
  useEffect(() => {
    const qs = new URLSearchParams();
    if (mode !== 'popular') qs.set('mode', mode);
    for (const g of genres) qs.append('genre', g);
    router.replace(`/browse/${cat}${qs.toString() ? `?${qs.toString()}` : ''}`, { scroll: false });
    setItems([]); setPage(1); setDone(false); setError(null); setLastAddedCount(0); setPrefetched(null);
  }, [mode, genres, cat, router]);

  // fetch genres list
  useEffect(() => {
    (async () => {
      try {
        const j = await fetchInternalAPI<{ items?: GenreOpt[] }>(`/api/genres?cat=${cat}`, { next: { revalidate: 86400 } });
        setAllGenres(j.items || []);
      } catch { /* silent */ }
    })();
  }, [cat]);

  const fetchPage = useCallback(async (targetPage: number, replace = false, prefetch = false) => {
    // cancel previous
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const initialLoad = targetPage === 1;
    if (!prefetch) {
      if (initialLoad) setLoading(true); else setIsLoadingMore(true);
    } else {
      setPrefetching(true);
    }
    if (initialLoad) setError(null);

    try {
      const params = new URLSearchParams({ take: String(PAGE_SIZE), page: String(targetPage), mode });
      if (genres.length) params.set('genres', genres.join(','));
      const keyDesc = { cat, page: targetPage, mode, genres: genres.join(',') };
      const t0 = performance.now();
      const json = await retryFetch(async () => {
  return fetchInternalAPI<{ items?: MediaItem[]; results?: MediaItem[] }>(`/api/popular/${cat}?${params.toString()}`, { cache: 'no-store', signal: ac.signal });
      });
      const next: MediaItem[] = json.items || json.results || [];
      const t1 = performance.now();
      if (prefetch) {
        setPrefetched(next);
        track('browse_prefetch', { ...keyDesc, duration_ms: Math.round(t1 - t0), count: next.length });
        setPrefetching(false);
        return;
      }

      setItems(prev => {
        const base = replace ? [] : prev;
        // dedupe by type:id
        const existingKeys = new Set(base.map(m => `${m.type}:${m.id}`));
        const filtered = next.filter(n => !existingKeys.has(`${n.type}:${n.id}`));
        const merged = [...base, ...filtered];
        setLastAddedCount(filtered.length);
        track('browse_page_load', { ...keyDesc, duration_ms: Math.round(t1 - t0), results_added: filtered.length, total: merged.length });
        return merged;
      });
      setDone(next.length < PAGE_SIZE || targetPage >= MAX_PAGES);
      setPage(targetPage);
      setError(null);
      // restore focus to load more after append
      if (targetPage > 1 && loadMoreBtnRef.current) {
        loadMoreBtnRef.current.focus({ preventScroll: true });
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return; // silent
      console.error('[browse:error]', e);
      if (targetPage === 1) {
        setItems([]);
      }
      setLastAddedCount(0);
      setError('Could not load items. Please retry.');
      track('browse_error', { cat, page: targetPage, mode, err: (e as Error).message });
    } finally {
      if (!prefetch) { setLoading(false); setIsLoadingMore(false); } else { setPrefetching(false); }
    }
  }, [cat, mode, genres]);

  // initial + dependency-driven fetch
  useEffect(() => {
    fetchPage(1, true);
  }, [cat, mode, genres, fetchPage]);

  const onLoadMore = () => {
    if (loading || isLoadingMore || done) return;
    if (prefetched) {
      // commit prefetched immediately
      setItems(prev => {
        const existingKeys = new Set(prev.map(m => `${m.type}:${m.id}`));
        const filtered = prefetched.filter(n => !existingKeys.has(`${n.type}:${n.id}`));
        const merged = [...prev, ...filtered];
        setLastAddedCount(filtered.length);
        setPage(p => p + 1);
        setDone(prefetched.length < PAGE_SIZE || page + 1 >= MAX_PAGES);
        if (loadMoreBtnRef.current) loadMoreBtnRef.current.focus({ preventScroll: true });
        return merged;
      });
      setPrefetched(null);
      return;
    }
    fetchPage(page + 1);
  };

  // Prefetch next page when sentinel near viewport
  useEffect(() => {
    if (done) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !prefetching && !prefetched && !loading && !isLoadingMore) {
          fetchPage(page + 1, false, true).catch(() => {});
        }
      });
    }, { rootMargin: '600px 0px 0px 0px', threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [page, done, prefetching, prefetched, loading, isLoadingMore, fetchPage]);

  const showInitialSkeletons = loading && items.length === 0 && !error;
  const showEmpty = !loading && !error && items.length === 0;
  const showError = !loading && !!error && items.length === 0;

  return (
    <main className="px-6 pb-24 mx-auto max-w-[1600px]">
      {/* Live region for a11y announcements */}
      <div aria-live="polite" className="sr-only">
        {loading ? (isLoadingMore ? 'Loading more items…' : 'Loading items…') : lastAddedCount ? `${lastAddedCount} items added.` : ''}
      </div>

      <FilterBar
        cat={cat}
        mode={mode}
        setMode={setMode}
        allGenres={allGenres}
        selectedGenres={genres}
        setSelectedGenres={setGenres}
        loadedCount={items.length}
      />

      {/* Error State */}
      {showError && (
        <div className="mt-16 flex flex-col items-center text-center gap-4">
          <div className="text-5xl">⚠️</div>
          <p className="text-lg font-semibold">Something went wrong</p>
          <p className="text-sm text-zinc-400 max-w-sm">{error}</p>
          <button onClick={() => fetchPage(1, true)} className="px-4 py-2 rounded bg-white text-black text-sm font-medium hover:bg-zinc-200">
            Retry
          </button>
        </div>
      )}

      {/* Initial skeletons */}
      {showInitialSkeletons && (
        <div className="mt-4 grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
          {Array.from({ length: 30 }).map((_, i) => <SkeletonTile key={i} />)}
        </div>
      )}

      {/* Empty State */}
      {showEmpty && (
        <div className="mt-16 flex flex-col items-center text-center gap-4">
          <div className="text-5xl">🧐</div>
          <p className="text-lg font-semibold">No results found</p>
          <p className="text-sm text-zinc-400 max-w-sm">Try adjusting your filters or selecting fewer genres to broaden the results.</p>
        </div>
      )}

      {/* Grid with items & inline incremental skeletons */}
      {!showInitialSkeletons && !showEmpty && !showError && (
        <div className="mt-4 grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
          {items.map(it => <MediaTile key={`${it.type}:${it.id}`} item={it} showQuickFav={false} />)}
          {(isLoadingMore || prefetching || prefetched) && Array.from({ length: cols }).map((_, i) => <SkeletonTile key={`sk-inline-${i}`} />)}
        </div>
      )}

      <div ref={sentinelRef} />
      {!done && !showEmpty && !showError && (
        <div className="flex justify-center mt-8">
          <button
            ref={loadMoreBtnRef}
            aria-busy={loading || isLoadingMore}
            disabled={loading || isLoadingMore}
            onClick={onLoadMore}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/15 disabled:opacity-50"
          >{prefetched ? 'Show more' : isLoadingMore ? 'Loading…' : 'Load more'}</button>
        </div>
      )}
      {done && items.length > 0 && (
        <div className="flex justify-center mt-8 text-xs text-zinc-500">That’s everything.</div>
      )}
    </main>
  );
}
