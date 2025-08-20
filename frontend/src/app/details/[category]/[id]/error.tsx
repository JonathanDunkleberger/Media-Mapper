'use client';
export default function ErrorState({ error }: { error: Error }) {
  return <div className="py-20 text-center text-red-500">Failed to load details: {error.message}</div>;
}
