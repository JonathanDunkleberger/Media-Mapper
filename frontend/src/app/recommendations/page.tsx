"use client";
import React, { useState, useEffect } from 'react';
import { RecommendationsGrid } from '../../components/RecommendationsGrid';
import type { KnownMedia } from '../../types/media';

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<KnownMedia[]>([]);

  useEffect(() => {
    // Load recommendations from sessionStorage
    try {
      const raw = window.sessionStorage.getItem('recommendations');
      if (raw) setRecommendations(JSON.parse(raw));
    } catch {}
  }, []);

  return (
    <main className="min-h-screen bg-[var(--xprime-bg)] text-[var(--xprime-text)] flex flex-col items-center py-10">
      <h1 className="text-3xl font-bold mb-8">Your Recommendations</h1>
      <div className="w-full max-w-6xl">
        <RecommendationsGrid items={recommendations} />
      </div>
    </main>
  );
}
