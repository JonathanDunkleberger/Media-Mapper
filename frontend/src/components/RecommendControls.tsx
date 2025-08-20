"use client";

import { useState, useEffect } from 'react';
import { useFavorites } from '@/hooks/useFavorites';
import { fetchInternalAPI } from '@/lib/api';
import { apiUrl } from '@/lib/api-base';

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}`;
}

export function RecommendButton() {
  const { data: favs = [] } = useFavorites();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!favs.length) return;
    setBusy(true);
    try {
  await fetchInternalAPI(apiUrl('recommend'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ favorites: favs }),
      });
      setCookie('mm_recommend', '1', 60 * 60 * 24 * 30);
      location.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={run}
      disabled={!favs.length || busy}
      className="rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-white/10 px-4 py-2 text-sm font-semibold text-white disabled:text-zinc-400 disabled:opacity-50 transition-colors"
      aria-disabled={!favs.length || busy}
      title={favs.length ? 'Get personalized recommendations' : `Add at least some favorites first`}
    >
      {busy ? '🎯 Preparing…' : '🎯 Get Recs'}
    </button>
  );
}

export function ShowTrendingButton() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(document.cookie.includes('mm_recommend=1'));
  }, []);

  const clear = () => {
    setCookie('mm_recommend', '0', 0);
    location.reload();
  };

  if (!on) return null;
  return (
    <button
      onClick={clear}
      className="rounded-lg bg-zinc-600 hover:bg-zinc-700 px-3 py-2 text-sm font-medium text-white transition-colors"
      title="Back to trending content"
    >
      ← Trending
    </button>
  );
}
