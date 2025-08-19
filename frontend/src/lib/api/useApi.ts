'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiGet } from './client';
import type { Api } from './types';

export type UseApiQuery = Record<string, string | number | boolean | undefined>;

export function useApi<T>(key: string, path: string, query?: UseApiQuery) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const stableQuery = useMemo(() => JSON.stringify(query ?? {}), [query]);
  const latestKey = useRef(key);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    apiGet<T>(path, { query, signal: controller.signal as any })
      .then((res: Api<T>) => {
        if (controller.signal.aborted) return;
        if (res.ok) setData(res.data); else setError(res.error);
      })
      .catch((e) => !controller.signal.aborted && setError(e?.message ?? 'Unknown error'))
      .finally(() => !controller.signal.aborted && setLoading(false));

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, stableQuery, latestKey.current]);

  return { data, error, loading };
}
