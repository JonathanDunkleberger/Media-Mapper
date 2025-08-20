// Deprecated: internalBaseUrl. Use apiUrl for all internal API calls.


import { apiUrl } from '@/lib/apiUrl';

/**
 * fetchInternalAPI: fetch with timeout, error handling, and slow-request logging.
 */
export async function fetchInternalAPI<T = unknown>(endpoint: string, init: (RequestInit & { timeoutMs?: number }) = {}): Promise<T> {
  const url = apiUrl(endpoint);
  const timeoutMs = init.timeoutMs ?? 5000;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    clearTimeout(id);
    const elapsed = Date.now() - started;
  // If slow, log (disabled for production lint)
  // if (elapsed > 2000) {
  //   console.warn(`[fetchInternalAPI] Slow request (${elapsed}ms): ${url}`);
  // }
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json() as Promise<T>;
    return res.text() as unknown as T;
  } catch (err) {
    if ((err as any).name === 'AbortError') {
      // Timeout error (logging disabled for production lint)
      // console.error(`[fetchInternalAPI] Timeout after ${timeoutMs}ms: ${url}`);
      throw new Error(`Timeout after ${timeoutMs}ms: ${url}`);
    }
    // console.error(`[fetchInternalAPI] Error: ${url}`, err);
    throw err;
  }
}
