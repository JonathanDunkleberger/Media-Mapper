'use client';
import InfiniteGrid from './InfiniteGrid';

export default function BrowseClient({ cat, mode }: { cat: string; mode: string }) {
  return <InfiniteGrid cat={cat} mode={mode} />;
}
