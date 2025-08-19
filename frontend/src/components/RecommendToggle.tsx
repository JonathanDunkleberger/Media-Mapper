"use client";
import { useState, useEffect } from 'react';

export function RecommendToggle() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(typeof document !== 'undefined' && document.cookie.includes('mm_recommend=1'));
  }, []);
  const toggle = () => {
    const next = !on;
    document.cookie = `mm_recommend=${next ? 1 : 0}; path=/; max-age=${60 * 60 * 24 * 30}`;
    setOn(next);
    location.reload();
  };
  return (
    <button onClick={toggle} className="text-xs sm:text-sm rounded bg-white/10 px-3 py-1 hover:bg-white/20">
      {on ? 'Showing: Recommended' : 'Showing: Trending'}
    </button>
  );
}
