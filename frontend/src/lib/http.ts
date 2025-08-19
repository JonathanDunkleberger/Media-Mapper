import 'server-only';

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
  const timer = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      if (res.status >= 500 && tries > 0) {
        await new Promise(r => setTimeout(r, backoffMs));
        return fetchJSON<T>(input, init, { tries: tries - 1, backoffMs: backoffMs * 2 });
      }
      throw new HttpError(res.status, body.slice(0, 500), typeof input === 'string' ? input : String((input as any).url ?? input));
    }
    return (await res.json()) as T;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[fetchJSON]', err);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
