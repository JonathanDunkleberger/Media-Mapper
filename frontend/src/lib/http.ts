// server-only removed for test compatibility

export class HttpError extends Error {
  constructor(public status: number, public body: string, public url: string) {
    super(`HTTP ${status} ${url}`);
  }
}

type RetryOpts = { tries?: number; backoffMs?: number };

export async function fetchJSON<T>(
  input: string | URL | Request,
  init: RequestInit = {},
  retry: RetryOpts = {}
): Promise<T> {
  const { tries = 2, backoffMs = 350 } = retry;
  const controller = new AbortController();
  const timeoutMs = 5000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    const elapsed = Date.now() - started;
    // if (elapsed > 2000) {
    //   console.warn(`[fetchJSON] Slow request (${elapsed}ms): ${typeof input === 'string' ? input : String((input as any).url ?? input)}`);
    // }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      if (res.status >= 500 && tries > 0) {
        await new Promise(r => setTimeout(r, backoffMs));
        return fetchJSON<T>(input, init, { tries: tries - 1, backoffMs: backoffMs * 2 });
      }
      throw new HttpError(res.status, body.slice(0, 500), typeof input === 'string' ? input : String((input as any).url ?? input));
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
