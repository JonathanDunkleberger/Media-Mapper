'use client';

import React, { useState, useEffect } from 'react';
import { SearchBar } from '../components/SearchBar';
import { InLoveList } from '../components/InLoveList';
import { MediaCarousel } from '../components/MediaCarousel';
import { Hero } from '../components/Hero';
import { MoodFilters } from '../components/MoodFilters';
import type { KnownMedia } from '../types/media';
import { getId, getField } from '../utils/mediaHelpers';

export default function Home() {
  const handleAddToInLove = (item: KnownMedia) => {
    const id = getId(item);
    if (id == null) return;
    setInLoveList(prev => prev.some(i => getId(i) === id) ? prev : [...prev, item]);
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
  const [popularGames, setPopularGames] = useState<KnownMedia[]>([]);
  const [popularMovies, setPopularMovies] = useState<KnownMedia[]>([]);
  const [popularTv, setPopularTv] = useState<KnownMedia[]>([]);
  const [popularBooks, setPopularBooks] = useState<KnownMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inLoveList, setInLoveList] = useState<KnownMedia[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<null | {
    games?: KnownMedia[];
    movies?: KnownMedia[];
    tv?: KnownMedia[];
    books?: KnownMedia[];
  }>(null);

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
      if (gamesRes.success && Array.isArray(gamesRes.games)) {
        setPopularGames(gamesRes.games);
      } else {
        setPopularGames([]);
      }
      if (moviesRes.success && Array.isArray(moviesRes.movies)) {
        setPopularMovies(moviesRes.movies);
      } else {
        setPopularMovies([]);
      }
      if (tvRes.success && Array.isArray(tvRes.tv)) setPopularTv(tvRes.tv); else setPopularTv([]);
      if (booksRes.success && Array.isArray(booksRes.books)) setPopularBooks(booksRes.books); else setPopularBooks([]);
    })
    .catch(console.error)
    .finally(() => setIsLoading(false));
  }, [backendBase]);
  const backend = backendBase;

  const handleGetRecommendations = async () => {
    if (!inLoveList.length) return;
    setRecsLoading(true);
    setRecsError(null);
    try {
      // Sanitize favorites to a minimal transferable shape (avoids accidental unserializable props)
      const favoritesPayload = inLoveList.map(f => ({
        type: (f as any).type || (f as any).media_type,
        external_id: (f as any).external_id || (f as any).id || (f as any).key,
        title: (f as any).title || (f as any).name,
        // Preserve existing normalized image field if present
        cover_image_url: (f as any).cover_image_url || (f as any).poster_path || (f as any).image_url || null
      }));
      const bodyObj = { favorites: favoritesPayload };
      let bodyJson: string;
      try { bodyJson = JSON.stringify(bodyObj); } catch (serr) { throw new Error('Serialization failed: ' + (serr instanceof Error ? serr.message : 'unknown')); }
      const res = await fetch(`${backend}/api/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: bodyJson
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const films = data.films || data.recommendations?.films || [];
      const movies = data.movies || data.recommendations?.movies || films; // map films -> movies
      setRecommendations({
        games: data.games || data.recommendations?.games || [],
        movies,
        tv: data.tv || data.recommendations?.tv || [],
        books: data.books || data.recommendations?.books || []
      });
    } catch (e: unknown) {
      if (e instanceof Error) console.error('Recommendation fetch failed', e.message);
      else console.error('Recommendation fetch failed', e);
      setRecsError('Failed to fetch recommendations');
      setRecommendations(null);
    } finally {
      setRecsLoading(false);
    }
  };

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
              {recsError && <div className="text-sm text-red-400">{recsError}</div>}
            </div>
      <MoodFilters />
          </div>
        </Hero>
        {/* Discovery (hidden when recommendations present) */}
        <div className="mt-10">
          {!isLoading && !(
            recommendations && (
              (recommendations.games && recommendations.games.length) ||
              (recommendations.movies && recommendations.movies.length) ||
              (recommendations.tv && recommendations.tv.length) ||
              (recommendations.books && recommendations.books.length)
            )
          ) && (
            <>
              <section className="full-bleed-section py-4">
                <div className="content-wrapper">
                  <MediaCarousel title="Trending Games" items={popularGames} />
                </div>
              </section>
              <section className="full-bleed-section py-4">
                <div className="content-wrapper">
                  <MediaCarousel title="Popular Movies" items={popularMovies} />
                </div>
              </section>
              <section className="full-bleed-section py-4">
                <div className="content-wrapper">
                  <MediaCarousel title="Top TV Shows" items={popularTv} />
                </div>
              </section>
              <section className="full-bleed-section py-4">
                <div className="content-wrapper">
                  <MediaCarousel title="Popular Books" items={popularBooks} />
                </div>
              </section>
            </>
          )}
        </div>
        {/* Recommendations */}
        {recommendations && (
          <div className="w-full mt-12 space-y-4">
            <section className="full-bleed-section py-4">
              <div className="content-wrapper">
                <MediaCarousel title="Recommended Games" items={recommendations.games || []} />
              </div>
            </section>
            <section className="full-bleed-section py-4">
              <div className="content-wrapper">
                <MediaCarousel title="Recommended Movies" items={recommendations.movies || []} />
              </div>
            </section>
            <section className="full-bleed-section py-4">
              <div className="content-wrapper">
                <MediaCarousel title="Recommended TV Shows" items={recommendations.tv || []} />
              </div>
            </section>
            <section className="full-bleed-section py-4">
              <div className="content-wrapper">
                <MediaCarousel title="Recommended Books" items={recommendations.books || []} />
              </div>
            </section>
            {(!recommendations.games?.length && !recommendations.movies?.length && !recommendations.tv?.length && !recommendations.books?.length) && (
              <div className="text-center text-sm text-gray-400 content-wrapper">No recommendations returned. Try adding more varied favorites.</div>
            )}
          </div>
        )}
      </div>
      {/* Right sidebar */}
      <aside className="hidden md:flex w-64 xl:w-72 border-l border-[var(--xprime-border)] bg-[var(--xprime-bg-alt)]/80 backdrop-blur-sm p-4 flex-col sticky top-0 max-h-screen">
        <InLoveList items={inLoveList} onRemove={handleRemoveFromInLove} variant="sidebar" className="h-full" />
      </aside>
    </main>
  );
}