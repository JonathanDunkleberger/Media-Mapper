"use client";

import { useState, useEffect } from 'react';
import { useFavorites } from '@/store/favorites';
import { fetchInternalAPI } from '@/lib/api';

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}`;
}

export function RecommendButton() {
  const favs = useFavorites(s => s.items);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!favs.length) return;
    setBusy(true);
    try {
      await fetchInternalAPI(`/api/recommend`, {
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
      className="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20 disabled:opacity-50"
      aria-disabled={!favs.length || busy}
      title={favs.length ? 'Show recommendations' : 'Add some favorites first'}
    >
      {busy ? 'Preparing…' : 'Recommend'}
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
      className="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
      title="Back to trending rows"
    >
      Trending
    </button>
  );
}
