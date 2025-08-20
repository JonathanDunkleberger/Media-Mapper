'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode, useState } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 60_000,
      },
      mutations: {
        retry: 0,
      },
    },
  }));
  return <QueryClientProvider client={qc}>{children}<ReactQueryDevtools initialIsOpen={false} /></QueryClientProvider>;
}
