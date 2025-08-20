'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-4 text-red-600 space-y-2">
      <div>Something went wrong: {error.message}</div>
      <button onClick={reset} className="px-3 py-1 rounded border">Try again</button>
    </div>
  );
}
