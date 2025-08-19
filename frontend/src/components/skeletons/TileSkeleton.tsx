export function TileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-[270px] w-[180px] rounded-xl bg-zinc-800/60" />
      <div className="mt-2 h-3 w-32 rounded bg-zinc-800/60" />
      <div className="mt-1 h-2 w-20 rounded bg-zinc-800/50" />
    </div>
  );
}
