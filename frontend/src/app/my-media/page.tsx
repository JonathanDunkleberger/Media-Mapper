"use client";
export const dynamic = 'force-dynamic';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
// import { getId, normalizeMediaData } from '../../utils/mediaHelpers';
import { InLoveList } from '../../components/InLoveList';
// import { RecommendationsGrid } from '../../components/RecommendationsGrid';
import type { KnownMedia } from '../../types/media';

export default function MyMediaPage() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<KnownMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';

  useEffect(() => {
    const controller = new AbortController();
    const fetchFavorites = async () => {
      if (!user) {
        // Guest user logic
        try {
          const raw = localStorage.getItem('guest-favorites');
          setFavorites(raw ? JSON.parse(raw) : []);
        } catch {
          setFavorites([]);
        }
        return;
      }

      // Authenticated user logic
      try {
        const token = localStorage.getItem('sb-access-token') || '';
        const res = await fetch(`${backendBase}/api/favorites`, {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: controller.signal
        });
        if (!res.ok) throw new Error('Failed to fetch favorites');
        const data = await res.json();
        if (Array.isArray(data.favorites)) {
          const validFavorites = data.favorites
            .map((fav: any) => fav.media)
            .filter(Boolean);
          setFavorites(validFavorites as KnownMedia[]);
        } else {
          setFavorites([]);
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        console.error(err);
        setFavorites([]);
      }
    };
    fetchFavorites();
    return () => {
      controller.abort();
    };
  }, [user, backendBase]);

  const handleGetRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${backendBase}/api/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorites }),
      });
      if (!res.ok) throw new Error('Failed to fetch recommendations');
      const data = await res.json();
      // Store recommendations in sessionStorage for the recommendations page
      if (Array.isArray(data.recommendations)) {
        window.sessionStorage.setItem('recommendations', JSON.stringify(data.recommendations));
        router.push('/recommendations');
      } else {
        setError('No recommendations returned');
      }
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--xprime-bg)] text-[var(--xprime-text)] flex flex-col items-center py-10">
      <h1 className="text-3xl font-bold mb-8">My Media</h1>
      <div className="w-full max-w-5xl">
        <InLoveList items={favorites} onRemove={() => {}} />
        <div className="flex flex-col items-center mt-8">
          <button
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-600 text-white font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={favorites.length === 0 || loading}
            onClick={handleGetRecommendations}
          >
            {loading ? 'Getting Recommendations...' : 'Get Recommendations'}
          </button>
          {error && <div className="text-red-500 mt-2">{error}</div>}
        </div>
  {/* Recommendations are now shown on the dedicated page */}
      </div>
    </main>
  );
}
