import { tmdbJson } from '@/lib/tmdb';
import { tmdbPosterUrl } from '@/lib/images';
import { SafeImage } from '@/components/SafeImage';
import MediaRowCarousel from '@/components/MediaRowCarousel';
import type { MediaItem } from '@/lib/types';

type RawParams = { [k: string]: string | string[] | undefined };

interface MediaDetailPageProps {
  params?: Promise<RawParams>; // Match Next.js 15 generated PageProps shape (promise-wrapped)
}

interface TmdbMovieOrTvBase {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  overview?: string | null;
}

async function fetchDetail(type: string, id: string): Promise<{ core: TmdbMovieOrTvBase; similar: MediaItem[] } | null> {
  if (type === 'movie' || type === 'tv') {
    try {
      const data = await tmdbJson<TmdbMovieOrTvBase>(`/${type}/${id}`);
      interface TmdbSimilar { id: number; title?: string; name?: string; poster_path?: string | null; release_date?: string; first_air_date?: string }
      const sim = await tmdbJson<{ results?: TmdbSimilar[] }>(`/${type}/${id}/similar`);
      const similar: MediaItem[] = (sim.results ?? []).slice(0, 20).map(r => {
        const dateStr = r.release_date || r.first_air_date || null;
        const yearVal = dateStr ? new Date(dateStr).getFullYear() : null;
        return {
          id: r.id,
          type: (r.title ? 'movie' : 'tv') as 'movie' | 'tv',
          title: (r.title ?? r.name ?? 'Untitled') as string,
          year: yearVal,
          posterUrl: r.poster_path ? tmdbPosterUrl(r.poster_path, 'w300') : null,
          sublabel: `${r.title ? 'MOVIE' : 'TV'}${yearVal ? ` • ${yearVal}` : ''}`,
        };
      });
      return { core: data, similar };
    } catch {
      return null;
    }
  }
  return null; // placeholder for other types
}

export default async function MediaDetailPage({ params }: MediaDetailPageProps) {
  const resolved = (await params) as RawParams | undefined;
  const typeVal = resolved?.type;
  const idVal = resolved?.id;
  const type = Array.isArray(typeVal) ? typeVal[0] : typeVal;
  const id = Array.isArray(idVal) ? idVal[0] : idVal;
  if (!type || !id) {
    return <div className="p-8 text-sm text-red-400">Missing route params.</div>;
  }
  const data = await fetchDetail(type, id);
  if (!data) {
    return <div className="p-8 text-sm text-red-400">Not found.</div>;
  }
  const title = data.core.title || data.core.name || 'Untitled';
  const poster = tmdbPosterUrl(data.core.poster_path, 'w500');
  return (
    <main className="max-w-6xl mx-auto p-6 space-y-10">
      <div className="flex gap-8">
        <div>
          <SafeImage src={poster} alt={title} w={300} h={450} className="rounded-xl object-cover" />
        </div>
        <div className="flex-1 space-y-4">
          <h1 className="text-3xl font-bold">{title}</h1>
          {data.core.overview && <p className="text-sm text-zinc-300 leading-relaxed max-w-prose">{data.core.overview}</p>}
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">ID: {id}</p>
        </div>
      </div>
      {!!data.similar.length && (
        <MediaRowCarousel title="Similar" items={data.similar} />
      )}
    </main>
  );
}
