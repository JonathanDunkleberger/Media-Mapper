// Shim to provide a default export type for algoliasearch/lite (v5)
// This allows `import algoliasearch from 'algoliasearch/lite'` without TS error.
// If upstream types add the default export, this file can be removed.
declare module 'algoliasearch/lite' {
  // Minimal typings needed for our usage; not a full re-declaration.
  export interface AlgoliaSearchResponse<T> { hits: T[]; [k: string]: unknown }
  export interface SearchIndex {
    search<T>(query: string, params?: Record<string, unknown>): Promise<AlgoliaSearchResponse<T>>;
  }
  export interface SearchClient {
    initIndex(name: string): SearchIndex;
  }
  export default function algoliasearch(appId: string, apiKey: string): SearchClient;
}
