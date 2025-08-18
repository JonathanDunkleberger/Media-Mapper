'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { SearchBar } from '../components/SearchBar';
import { InLoveList } from '../components/InLoveList';
import { MediaCarousel } from '../components/MediaCarousel';
import { Hero } from '../components/Hero';
import { MoodFilters } from '../components/MoodFilters';
import type { KnownMedia } from '../types/media';
import { getId, getField, normalizeMediaData } from '../utils/mediaHelpers';

export default function Home() {
  const { user } = useAuth();
  // Add to favorites: if logged in, call API; else local state
  const handleAddToInLove = async (item: KnownMedia) => {
    const normalized = normalizeMediaData(item);
    const id = getId(normalized);
    if (id == null) return;
    if (user) {
      try {
        const token = (await window?.localStorage.getItem('sb-access-token')) || '';
        await fetch(`${backendBase}/api/favorites`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ media_id: id })
        });
        // Optionally: fetch updated favorites from server
      } catch (e) { console.error('Add favorite failed', e); }
    } else {
      setInLoveList(prev => {
        const exists = prev.some(i => getId(i) === id);
        const updated = exists ? prev : [...prev, normalized];
        // Save to localStorage for guests
        window.localStorage.setItem('guest-favorites', JSON.stringify(updated));
        return updated;
      });
    }
  };
  const handleRemoveFromInLove = (id: string | number) => {
    setInLoveList((prev) => prev.filter((item) => {
      if ('id' in item && item.id !== undefined) return item.id !== id;
      if ('key' in item && item.key !== undefined) return item.key !== id;
      const ext = getField<string | number>(item, 'external_id');
      if (ext !== undefined) return ext !== id;
      return ((('title' in item ? item.title : ('name' in item ? item.name : '')) ?? '') !== id);
    }));
  };
  // Unified media data state holding both popular and recommended datasets
  const [mediaData, setMediaData] = useState({
    popular: { games: [] as KnownMedia[], movies: [] as KnownMedia[], tv: [] as KnownMedia[], books: [] as KnownMedia[] },
    recommended: { games: [] as KnownMedia[], movies: [] as KnownMedia[], tv: [] as KnownMedia[], books: [] as KnownMedia[] }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [inLoveList, setInLoveList] = useState<KnownMedia[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'popular' | 'recommended'>('popular');

  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';

  useEffect(() => {
    const backend = backendBase;
    Promise.all([
      fetch(`${backend}/api/popular/games`).then(res => res.json()),
      fetch(`${backend}/api/popular/movies`).then(res => res.json()),
      fetch(`${backend}/api/popular/tv`).then(res => res.json()),
      fetch(`${backend}/api/popular/books`).then(res => res.json())
    ])
      .then(([gamesRes, moviesRes, tvRes, booksRes]) => {
        setMediaData(prev => ({
          ...prev,
          popular: {
            games: gamesRes.success && Array.isArray(gamesRes.games) ? gamesRes.games.map((g: KnownMedia) => normalizeMediaData(g)) : [],
            movies: moviesRes.success && Array.isArray(moviesRes.movies) ? moviesRes.movies.map((m: KnownMedia) => normalizeMediaData(m)) : [],
            tv: tvRes.success && Array.isArray(tvRes.tv) ? tvRes.tv.map((t: KnownMedia) => normalizeMediaData(t)) : [],
            books: booksRes.success && Array.isArray(booksRes.books) ? booksRes.books.map((b: KnownMedia) => normalizeMediaData(b)) : []
          }
        }));
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));

    // On login, fetch user favorites
    if (user) {
      (async () => {
        try {
          const token = (await window?.localStorage.getItem('sb-access-token')) || '';
          const res = await fetch(`${backendBase}/api/favorites`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const { favorites } = await res.json();
            // favorites: [{ media_id, media: {...} }]
            setInLoveList(Array.isArray(favorites) ? favorites.map((f: { media?: unknown }) => f.media).filter(Boolean) as KnownMedia[] : []);
          }
        } catch (e) { console.error('Fetch favorites failed', e); }
      })();
    }
  }, [backendBase, user]);
  const backend = backendBase;

  const handleGetRecommendations = async () => {
    if (!inLoveList.length) return;
    setRecsLoading(true);
    setRecsError(null);
    try {
      const favoritesPayload = inLoveList.map(f => {
        const type = (typeof f === 'object' && f && 'type' in f && typeof f.type === 'string') ? f.type : (typeof f === 'object' && f && 'media_type' in f && typeof (f as { media_type?: string }).media_type === 'string' ? (f as { media_type: string }).media_type : undefined);
        const external_id = (typeof f === 'object' && f && 'external_id' in f) ? (f as { external_id?: string | number }).external_id : (typeof f === 'object' && f && 'id' in f ? (f as { id?: string | number }).id : (typeof f === 'object' && f && 'key' in f ? (f as { key?: string | number }).key : undefined));
        const title = (typeof f === 'object' && f && 'title' in f && typeof f.title === 'string') ? f.title : (typeof f === 'object' && f && 'name' in f && typeof (f as { name?: string }).name === 'string' ? (f as { name: string }).name : undefined);
        const cover_image_url = (typeof f === 'object' && f && 'cover_image_url' in f && typeof (f as { cover_image_url?: string }).cover_image_url === 'string') ? (f as { cover_image_url: string }).cover_image_url : (typeof f === 'object' && f && 'poster_path' in f && typeof (f as { poster_path?: string }).poster_path === 'string' ? (f as { poster_path: string }).poster_path : (typeof f === 'object' && f && 'image_url' in f && typeof (f as { image_url?: string }).image_url === 'string' ? (f as { image_url: string }).image_url : null));
        return { type, external_id, title, cover_image_url };
      });
      const bodyObj = { favorites: favoritesPayload };
      const bodyJson = JSON.stringify(bodyObj);
      const res = await fetch(`${backend}/api/recommend`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: bodyJson });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const films = data.films || data.recommendations?.films || [];
      const movies = data.movies || data.recommendations?.movies || films;
      const normalizedRecommendations = {
        games: (data.games || data.recommendations?.games || []).map((x: KnownMedia) => normalizeMediaData(x)),
        movies: (movies || []).map((x: KnownMedia) => normalizeMediaData(x)),
        tv: (data.tv || data.recommendations?.tv || []).map((x: KnownMedia) => normalizeMediaData(x)),
        books: (data.books || data.recommendations?.books || []).map((x: KnownMedia) => normalizeMediaData(x))
      };
      setMediaData(prev => ({ ...prev, recommended: normalizedRecommendations }));
      setViewMode('recommended');
    } catch (e: unknown) {
      console.error('Recommendation fetch failed', e);
      setRecsError('Failed to fetch recommendations');
      setViewMode('popular');
    } finally {
      setRecsLoading(false);
    }
  };

  // Derived dataset for carousels (always four static carousels)
  const carouselData = useMemo(() => viewMode === 'recommended' ? mediaData.recommended : mediaData.popular, [viewMode, mediaData]);

  const titlePrefix = viewMode === 'recommended' ? 'Recommended' : viewMode === 'popular' ? 'Popular' : '';

  return (
    <main className="min-h-screen flex bg-[var(--xprime-bg)] text-[var(--xprime-text)]">
      {/* Left content column */}
      <div className="flex-1 flex flex-col px-4 sm:px-6 md:px-10 pt-6 md:pt-10 max-w-[1500px] mx-auto">
    <Hero>
          <div className="space-y-5 max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/60 text-transparent bg-clip-text">Find Your Next Favorite Media</h1>
            <SearchBar onSelect={handleAddToInLove} />
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                onClick={handleGetRecommendations}
                disabled={!inLoveList.length || recsLoading}
                className="px-6 py-2 rounded-lg bg-[var(--xprime-purple)] hover:bg-[var(--xprime-purple-accent)] disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition w-full sm:w-auto shadow-md shadow-[rgba(139,92,246,0.3)]"
              >
                {recsLoading ? 'Getting Recommendations...' : 'Get Recommendations'}
              </button>
              {viewMode === 'recommended' && (
                <button
                  onClick={() => setViewMode('popular')}
                  disabled={recsLoading}
                  className="px-6 py-2 rounded-lg bg-[var(--xprime-surface-alt)] hover:bg-[var(--xprime-purple)]/30 border border-[var(--xprime-border)] font-semibold transition w-full sm:w-auto"
                >
                  Back to Popular
                </button>
              )}
              {recsError && <div className="text-sm text-red-400">{recsError}</div>}
            </div>
      <MoodFilters />
          </div>
        </Hero>
        {/* Static carousels (dataset switches via viewMode) */}
        <div className="w-full mt-10 space-y-6">
          <MediaCarousel
            title={titlePrefix === 'Popular' ? 'Trending Games' : `${titlePrefix} Games`}
            items={carouselData.games}
            loading={recsLoading && viewMode === 'recommended'}
            emptyMessage={viewMode === 'recommended' ? 'No recommended games yet.' : 'No games available.'}
          />
          <MediaCarousel
            title={`${titlePrefix} Movies`}
            items={carouselData.movies}
            loading={recsLoading && viewMode === 'recommended'}
            emptyMessage={viewMode === 'recommended' ? 'No recommended movies yet.' : 'No movies available.'}
          />
          <MediaCarousel
            title={titlePrefix === 'Popular' ? 'Top TV Shows' : `${titlePrefix} TV Shows`}
            items={carouselData.tv}
            loading={recsLoading && viewMode === 'recommended'}
            emptyMessage={viewMode === 'recommended' ? 'No recommended TV shows yet.' : 'No TV shows available.'}
          />
          <MediaCarousel
            title={`${titlePrefix} Books`}
            items={carouselData.books}
            loading={recsLoading && viewMode === 'recommended'}
            emptyMessage={viewMode === 'recommended' ? 'No recommended books yet.' : 'No books available.'}
          />
        </div>
  {viewMode === 'recommended' && !recsLoading && !carouselData.games.length && !carouselData.movies.length && !carouselData.tv.length && !carouselData.books.length && (
          <div className="text-center text-sm text-gray-400 mt-4">No recommendations returned. Try adding more varied favorites.</div>
        )}
      </div>
      {/* Right sidebar */}
      <aside className="hidden md:flex w-64 xl:w-72 border-l border-[var(--xprime-border)] bg-[var(--xprime-bg-alt)]/80 backdrop-blur-sm p-4 flex-col sticky top-0 max-h-screen">
        <InLoveList items={inLoveList} onRemove={handleRemoveFromInLove} variant="sidebar" className="h-full" />
      </aside>
    </main>
  );
}