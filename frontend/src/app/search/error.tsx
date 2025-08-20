'use client';
export default function ErrorState({ error }: { error: Error }) {
  return <p className="mt-6 text-sm text-rose-500 px-6">Search failed: {error.message}</p>;
}
