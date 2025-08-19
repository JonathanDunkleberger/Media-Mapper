import { tmdbJson, tmdbImage } from '@/lib/tmdb';
import { safePosterUrl } from '@/lib/image';
import { SafeImage } from '@/components/SafeImage';
import { NextResponse } from 'next/server';

interface Params { params: { type: string; id: string }; }

async function fetchDetail(type: string, id: string) {
  if (type === 'movie' || type === 'tv') {
    try {
      const data = await tmdbJson<any>(`/${type}/${id}`);
      return data;
    } catch {
      return null;
    }
  }
  return null; // placeholder for other types
}

export default async function MediaDetailPage({ params }: Params) {
  const { type, id } = params;
  const data = await fetchDetail(type, id);
  if (!data) {
    return <div className="p-8 text-sm text-red-400">Not found.</div>;
  }
  const title = data.title || data.name || 'Untitled';
  const poster = safePosterUrl(data.poster_path, 'w500');
  return (
    <main className="max-w-5xl mx-auto p-6 flex gap-8">
      <div>
        <SafeImage src={poster} alt={title} w={300} h={450} className="rounded-xl object-cover" />
      </div>
      <div className="flex-1 space-y-4">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-sm text-zinc-300/80">ID: {id}</p>
        {/* Additional metadata / credits placeholder */}
      </div>
    </main>
  );
}
