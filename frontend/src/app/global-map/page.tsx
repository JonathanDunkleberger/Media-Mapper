
// Global Map temporarily disabled to unblock core build
// import GlobalMapClientWrapper from '@/components/GlobalMapClientWrapper';

export default function GlobalMapPage() {
  return (
    <main className="min-h-screen bg-[var(--xprime-bg)] text-[var(--xprime-text)] flex flex-col items-center py-10">
      <h1 className="text-3xl font-bold mb-8">Global Media Map</h1>
      <div className="w-full max-w-3xl rounded border border-neutral-700 p-8 text-center text-sm text-neutral-400">
        Global Map feature is temporarily disabled. It will return once core deployment is stable.
      </div>
    </main>
  );
}