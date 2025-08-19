"use client";
// Lightweight skeleton placeholder matching MediaTile dimensions
export default function SkeletonTile() {
  return (
    <div className="relative block animate-pulse">
      <div className="rounded-xl overflow-hidden bg-zinc-800/40 ring-1 ring-white/10 h-[270px] w-[180px] flex items-center justify-center">
        <div className="w-full h-full bg-gradient-to-b from-zinc-700/40 to-zinc-800/60" />
      </div>
      <div className="mt-2 space-y-1 w-[180px]">
        <div className="h-3 rounded bg-white/10 w-5/6" />
        <div className="h-2.5 rounded bg-white/5 w-1/2" />
      </div>
    </div>
  );
}
