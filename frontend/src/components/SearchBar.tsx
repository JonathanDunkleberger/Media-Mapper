"use client";
import React, { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import algoliasearch from 'algoliasearch/lite';

type AlgoliaSearchResponse<T> = { hits: T[]; [key: string]: unknown };
import type { KnownMedia } from '../types/media';

interface SearchBarProps { onSelect: (item: KnownMedia) => void; }

// Internal components leveraging hooks API to keep main component lean
interface HitsDropdownProps {
  onSelect: (item: KnownMedia) => void;
  close: () => void;
  query: string;
  loading: boolean;
  error: string | null;
  results: KnownMedia[];
}


function extractTitle(hit: KnownMedia): string {
  if ('title' in hit && typeof hit.title === 'string' && hit.title) return hit.title;
  if ('name' in hit && typeof hit.name === 'string' && hit.name) return hit.name;
  if ('key' in hit && typeof hit.key === 'string' && hit.key) return hit.key;
  return '';
}


function extractImage(hit: KnownMedia): string {
  const possible: (string | undefined)[] = [];
  if ('image_url' in hit && typeof hit.image_url === 'string') possible.push(hit.image_url);
  if ('cover_image_url' in hit && typeof hit.cover_image_url === 'string') possible.push(hit.cover_image_url);
  if ('poster_path' in hit && typeof hit.poster_path === 'string') possible.push(hit.poster_path);
  if ('imageLinks' in hit && hit.imageLinks && typeof hit.imageLinks === 'object' && 'thumbnail' in hit.imageLinks && typeof hit.imageLinks.thumbnail === 'string') possible.push(hit.imageLinks.thumbnail);
  if ('background_image' in hit && typeof hit.background_image === 'string') possible.push(hit.background_image);
  const chosen = possible.find(Boolean);
  if (!chosen) return 'https://placehold.co/56x84';
  if (chosen.startsWith('http')) return chosen;
  // TMDB relative path fallback
  return chosen.startsWith('/t') ? `https://image.tmdb.org/t/p/w185${chosen}` : chosen;
}


function extractType(hit: KnownMedia): string | undefined {
  if ('type' in hit && typeof hit.type === 'string') return hit.type;
  if ('media_type' in hit && typeof hit.media_type === 'string') return hit.media_type;
  return undefined;
}

function HitsDropdown({ onSelect, close, query, loading, error, results }: HitsDropdownProps) {
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
        let id = '';
        if ('objectID' in hit && hit.objectID) id = String(hit.objectID);
        else if ('external_id' in hit && hit.external_id) id = String(hit.external_id);
        else if ('id' in hit && hit.id) id = String(hit.id);
        const key = `${mediaType}_${id || title}_${idx}`;
        const selectedItem: KnownMedia = { ...hit, title, type: mediaType as 'movie' | 'tv' | 'book' | 'game' };
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
  // No backendBase needed; use /api endpoints directly
  const indexName = 'media';

  // Hooks MUST be declared before any early returns referencing their state (Rules of Hooks compliance)
  const [query, setQuery] = useState<string>('');
  const [open, setOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<KnownMedia[]>([]);
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

      const pAlgolia = algoliaIndex.search<KnownMedia>(query, { hitsPerPage: 20 })
        .then((r: AlgoliaSearchResponse<KnownMedia>) => r.hits)
        .catch((e: unknown) => { throw new Error('Algolia: ' + (e instanceof Error ? e.message : 'failed')); });
  const backendUrl = `/api/search?q=${encodeURIComponent(query)}&type=all`;
      const pBackend = fetch(backendUrl, { signal: backendController.signal })
        .then(r => r.ok ? r.json() : Promise.reject(new Error('Backend HTTP ' + r.status)))
        .catch((e: unknown) => { throw new Error('Live: ' + (e instanceof Error ? e.message : 'failed')); });

      Promise.allSettled([pBackend, pAlgolia]).then(settled => {
        const backendRes = settled[0].status === 'fulfilled' ? settled[0].value as KnownMedia[] : [];
        const algoliaRes = settled[1].status === 'fulfilled' ? settled[1].value as KnownMedia[] : [];
        const errs: string[] = [];
        if (settled[0].status === 'rejected') errs.push((settled[0].reason as Error).message || 'live error');
        if (settled[1].status === 'rejected') errs.push((settled[1].reason as Error).message || 'algolia error');
        const seen = new Set<string>();
        const combined: KnownMedia[] = [];
        for (const src of [backendRes, algoliaRes]) {
          for (const item of src) {
            // Use type guards for uniqueKey
            let type = '';
            if ('media_type' in item && (item.media_type === 'movie' || item.media_type === 'tv' || item.media_type === 'book' || item.media_type === 'game')) {
              type = item.media_type;
            } else if ('type' in item && typeof item.type === 'string') {
              type = item.type;
            }
            let id = '';
            if ('external_id' in item && item.external_id) id = String(item.external_id);
            else if ('id' in item && item.id) id = String(item.id);
            else if ('objectID' in item && item.objectID) id = String(item.objectID);
            let title = '';
            if ('title' in item && item.title) title = String(item.title);
            else if ('name' in item && item.name) title = String(item.name);
            let key = '';
            if ('key' in item && item.key) key = String(item.key);
            const uniqueKey = `${type}_${id || title || key}`;
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
  }, [query, algoliaIndex]);

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

      const pAlgolia = algoliaIndex.search<KnownMedia>(query, { hitsPerPage: 20 })
        .then((r: AlgoliaSearchResponse<KnownMedia>) => r.hits)
        .catch((e: unknown) => { throw new Error('Algolia: ' + (e instanceof Error ? e.message : 'failed')); });
  const backendUrl = `/api/search?q=${encodeURIComponent(query)}&type=all`;
      const pBackend = fetch(backendUrl, { signal: backendController.signal })
        .then(r => r.ok ? r.json() : Promise.reject(new Error('Backend HTTP ' + r.status)))
        .catch((e: unknown) => { throw new Error('Live: ' + (e instanceof Error ? e.message : 'failed')); });

      Promise.allSettled([pBackend, pAlgolia]).then(settled => {
        const backendRes = settled[0].status === 'fulfilled' ? settled[0].value as KnownMedia[] : [];
        const algoliaRes = settled[1].status === 'fulfilled' ? settled[1].value as KnownMedia[] : [];
        const errs: string[] = [];
        if (settled[0].status === 'rejected') errs.push((settled[0].reason as Error).message || 'live error');
        if (settled[1].status === 'rejected') errs.push((settled[1].reason as Error).message || 'algolia error');
        const seen = new Set<string>();
        const combined: KnownMedia[] = [];
        for (const src of [backendRes, algoliaRes]) {
          for (const item of src) {
            // Use type guards for uniqueKey
            let type = '';
            if ('media_type' in item && (item.media_type === 'movie' || item.media_type === 'tv' || item.media_type === 'book' || item.media_type === 'game')) {
              type = item.media_type;
            } else if ('type' in item && typeof item.type === 'string') {
              type = item.type;
            }
            let id = '';
            if ('external_id' in item && item.external_id) id = String(item.external_id);
            else if ('id' in item && item.id) id = String(item.id);
            else if ('objectID' in item && item.objectID) id = String(item.objectID);
            let title = '';
            if ('title' in item && item.title) title = String(item.title);
            else if ('name' in item && item.name) title = String(item.name);
            let key = '';
            if ('key' in item && item.key) key = String(item.key);
            const uniqueKey = `${type}_${id || title || key}`;
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
  }, [query, algoliaIndex]);

  // --- RETURN THE JSX ---
  return (
    <div ref={containerRef} className="w-full relative">
      <input
        ref={inputRef}
        type="text"
        className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="Search movies, books, games..."
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && (
        <HitsDropdown
          onSelect={onSelect}
          close={() => setOpen(false)}
          query={query}
          loading={loading}
          error={error}
          results={results}
          // backendBase prop removed
        />
      )}
    </div>
  );
}
