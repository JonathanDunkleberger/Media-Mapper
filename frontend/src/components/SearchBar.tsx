"use client";
import React, { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import algoliasearch from 'algoliasearch/lite';

type AlgoliaSearchResponse<T> = { hits: T[]; [key: string]: unknown };
import type { KnownMedia, SearchResult } from '../types/media';

interface SearchBarProps { onSelect: (item: KnownMedia) => void; }

// Internal components leveraging hooks API to keep main component lean
interface HitsDropdownProps {
  onSelect: (item: KnownMedia) => void;
  close: () => void;
  query: string;
  loading: boolean;
  error: string | null;
  results: SearchResult[];
  backendBase: string;
}

function extractTitle(hit: SearchResult): string {
  return (
    hit.title ||
    hit.name ||
    (typeof hit.key === 'string' ? hit.key : '') ||
    ''
  );
}

function extractImage(hit: SearchResult): string {
  const possible: (string | undefined)[] = [
    typeof hit.image_url === 'string' ? hit.image_url : undefined,
    typeof hit.cover_image_url === 'string' ? hit.cover_image_url : undefined,
    typeof hit.poster_path === 'string' ? hit.poster_path : undefined,
    hit.imageLinks && typeof hit.imageLinks.thumbnail === 'string' ? hit.imageLinks.thumbnail : undefined,
    typeof hit.background_image === 'string' ? hit.background_image : undefined,
  ];
  const chosen = possible.find(Boolean);
  if (!chosen) return 'https://placehold.co/56x84';
  if (chosen.startsWith('http')) return chosen;
  // TMDB relative path fallback
  return chosen.startsWith('/t') ? `https://image.tmdb.org/t/p/w185${chosen}` : chosen;
}

function extractType(hit: SearchResult): SearchResult['type'] {
  return hit.type || hit.media_type || undefined;
}

function HitsDropdown({ onSelect, close, query, loading, error, results, backendBase }: HitsDropdownProps) {
  if (!query) return null;
  return (
    <ul className="absolute z-50 mt-1 max-h-96 w-full overflow-auto rounded-md bg-gray-800 py-1 text-sm shadow-lg ring-1 ring-black/20 divide-y divide-gray-700">
      {error && <li className="px-4 py-2 text-red-400">{error}</li>}
      {loading && !error && <li className="px-4 py-2 text-indigo-300 animate-pulse">Searching…</li>}
      {!loading && !error && results.length === 0 && <li className="px-4 py-2 text-gray-400">No results found</li>}
      {results.map((hit, idx) => {
        const title = extractTitle(hit);
        const mediaType = extractType(hit) || 'movie';
        const img = extractImage(hit);
        const key = `${mediaType}_${hit.objectID || hit.external_id || hit.id || title}_${idx}`;
        const selectedItem: KnownMedia = { ...hit, title, type: mediaType };
        return (
          <li
            key={key}
            className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-700"
            onClick={() => {
              onSelect(selectedItem);
              close();
            }}
          >
            <Image src={img} alt={title} width={48} height={64} className="w-12 h-16 object-cover rounded" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{title}</span>
              <span className="text-[11px] uppercase tracking-wide text-gray-400">{mediaType}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function SearchBar({ onSelect }: SearchBarProps) {
  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
  const searchKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY;
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';
  const indexName = 'media';

  // Hooks MUST be declared before any early returns referencing their state (Rules of Hooks compliance)
  const [query, setQuery] = useState<string>('');
  const [open, setOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<{ abortAlgolia?: () => void; abortBackend?: () => void }>({});

  // Memoize algolia index only when credentials exist (safe to pass undefined -> we gate use later)
  const algoliaIndex = useMemo(() => {
    if (!appId || !searchKey) return null;
    return algoliasearch(appId, searchKey).initIndex(indexName);
  }, [appId, searchKey]);

  // Outside click closes dropdown
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Perform hybrid search (debounced)
  useEffect(() => {
    if (!query) { setResults([]); setLoading(false); setError(null); return; }
    if (!algoliaIndex) { setError('Search unavailable'); return; }
    const debounce = setTimeout(() => {
      setLoading(true); setError(null);
      const algoliaController = new AbortController();
      const backendController = new AbortController();
      abortRef.current.abortAlgolia = () => algoliaController.abort();
      abortRef.current.abortBackend = () => backendController.abort();

      const pAlgolia = algoliaIndex.search<SearchResult>(query, { hitsPerPage: 20 })
        .then((r: AlgoliaSearchResponse<SearchResult>) => r.hits)
        .catch((e: unknown) => { throw new Error('Algolia: ' + (e instanceof Error ? e.message : 'failed')); });
      const backendUrl = `${backendBase}/api/search?q=${encodeURIComponent(query)}&type=all`;
      const pBackend = fetch(backendUrl, { signal: backendController.signal })
        .then(r => r.ok ? r.json() : Promise.reject(new Error('Backend HTTP ' + r.status)))
        .catch((e: unknown) => { throw new Error('Live: ' + (e instanceof Error ? e.message : 'failed')); });

      Promise.allSettled([pBackend, pAlgolia]).then(settled => {
        const backendRes = settled[0].status === 'fulfilled' ? settled[0].value as SearchResult[] : [];
        const algoliaRes = settled[1].status === 'fulfilled' ? settled[1].value as SearchResult[] : [];
        const errs: string[] = [];
        if (settled[0].status === 'rejected') errs.push((settled[0].reason as Error).message || 'live error');
        if (settled[1].status === 'rejected') errs.push((settled[1].reason as Error).message || 'algolia error');
        const seen = new Set<string>();
        const combined: SearchResult[] = [];
        for (const src of [backendRes, algoliaRes]) {
          for (const item of src) {
            const uniqueKey = `${item.type || item.media_type || ''}_${item.external_id || item.id || item.objectID || item.title || item.name || item.key}`;
            if (!seen.has(uniqueKey)) { seen.add(uniqueKey); combined.push(item); }
          }
        }
        setResults(combined.slice(0, 30));
        setError(errs.length ? errs.join(' | ') : null);
      }).finally(() => setLoading(false));
    }, 200);
    return () => {
      clearTimeout(debounce);
      abortRef.current.abortAlgolia?.();
      abortRef.current.abortBackend?.();
    };
  }, [query, algoliaIndex, backendBase]);

  return (
    <div ref={containerRef} className="w-full relative">
      <div className="relative">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          placeholder="Search for any media..."
          className="w-full rounded-md border border-gray-700 bg-gray-800 text-white py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setResults([]); setOpen(false); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 text-xs"
          >Clear</button>
        )}
      </div>
      {open && (
        <HitsDropdown
          backendBase={backendBase}
          onSelect={(item) => {
            onSelect(item);
            setOpen(false);
            setQuery('');
            setResults([]);
          }}
          close={() => setOpen(false)}
          query={query}
          loading={loading}
          error={error}
          results={results}
        />
      )}
    </div>
  );
}
