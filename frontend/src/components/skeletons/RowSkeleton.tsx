import { TileSkeleton } from './TileSkeleton';

export function RowSkeleton({ count = 6, title }: { count?: number; title: string }) {
  return (
    <section className="mt-8">
      <div className="mb-3 h-6 w-40 rounded bg-zinc-800/60 animate-pulse" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: count }).map((_, i) => (
          <TileSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}
