import SearchClient from './ui/SearchClient';
import { Suspense } from 'react';

export const metadata = { title: 'Search • Media Mapper' };
export const dynamic = 'force-dynamic';

export default function SearchPage() {
  return (
    <main className="px-6 pb-24">
      <Suspense fallback={<p className="mt-6 text-sm text-zinc-400">Loading search…</p>}>
        <SearchClient />
      </Suspense>
    </main>
  );
}
