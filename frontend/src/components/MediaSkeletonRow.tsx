"use client";
export default function MediaSkeletonRow({ title, count = 10 }: { title: string; count?: number }) {
  return (
    <section className="mt-8 animate-pulse">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="w-[180px]">
            <div className="h-[270px] w-[180px] rounded-xl bg-zinc-800/60" />
            <div className="mt-2 h-3 w-3/4 rounded bg-zinc-800/60" />
            <div className="mt-1 h-3 w-1/2 rounded bg-zinc-800/40" />
          </div>
        ))}
      </div>
    </section>
  );
}
