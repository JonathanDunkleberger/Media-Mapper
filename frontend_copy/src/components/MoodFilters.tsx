"use client";
import React from 'react';
import { useUIStore } from '../store/ui';

const MOODS = [
  { key: 'cozy', label: 'Cozy' },
  { key: 'epic', label: 'Epic' },
  { key: 'romantic', label: 'Romantic' },
  { key: 'dark', label: 'Dark' },
  { key: 'uplifting', label: 'Uplifting' },
  { key: 'mysterious', label: 'Mysterious' },
  { key: 'intense', label: 'Intense' },
];

export function MoodFilters() {
  const activeMood = useUIStore(s => s.activeMood);
  const setActiveMood = useUIStore(s => s.setActiveMood);

  return (
    <div className="flex flex-wrap gap-2">
      {MOODS.map(m => {
        const active = activeMood === m.key;
        return (
          <button
            key={m.key}
            onClick={() => setActiveMood(active ? null : m.key)}
            className={[
              'px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all',
              'border backdrop-blur-sm',
              active
                ? 'bg-[var(--xprime-purple)] text-white border-[var(--xprime-purple)] shadow-[0_0_0_1px_rgba(139,92,246,0.5),0_4px_14px_-2px_rgba(139,92,246,0.45)]'
                : 'bg-[var(--xprime-surface)]/60 text-white/70 border-[color-mix(in_oklab,var(--xprime-purple)_25%,#262035)] hover:text-white hover:border-[var(--xprime-purple)]'
            ].join(' ')}
            aria-pressed={active}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
