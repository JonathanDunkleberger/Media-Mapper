
import GlobalMapClientWrapper from '@/components/GlobalMapClientWrapper';

export default function GlobalMapPage() {
  return (
    <main className="min-h-screen bg-[var(--xprime-bg)] text-[var(--xprime-text)] flex flex-col items-center py-10">
      <h1 className="text-3xl font-bold mb-8">Global Media Map</h1>
      <div className="w-full max-w-6xl h-[600px] rounded-lg shadow-lg overflow-hidden">
        <GlobalMapClientWrapper />
      </div>
    </main>
  );
}