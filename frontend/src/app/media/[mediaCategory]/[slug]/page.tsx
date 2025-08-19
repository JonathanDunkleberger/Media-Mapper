import { MediaCarousel } from '../../../../components/MediaCarousel';
import type { KnownMedia } from '../../../../types/media';
import { getImageUrl, getTitle, getField, normalizeMediaData } from '../../../../utils/mediaHelpers';
import { isMovie, isBook, isGame } from '../../../../types/media';
import { fetchInternalAPI } from '@/lib/api';
import Image from 'next/image';

export default async function MediaDetailPage(props: unknown) {
  const p = props as { params?: { mediaCategory: string; slug: string } } | undefined;
  const { mediaCategory, slug } = (p?.params ?? {}) as { mediaCategory: string; slug: string };
  const mediaRaw = await fetchInternalAPI<KnownMedia>(`/api/media/${mediaCategory}/${slug}`);
  const media = normalizeMediaData(mediaRaw);
  const similarRaw = await fetchInternalAPI<KnownMedia[]>(`/api/media/${mediaCategory}/${slug}/similar`);
  const similar = similarRaw.map(item => normalizeMediaData(item));

  let imageUrl = '/placeholder-media.png';
  if (isMovie(media) || isGame(media) || isBook(media)) {
    imageUrl = getImageUrl(media as import('../../../../types/media').MediaType);
  }
  return (
    <main className="bg-black min-h-screen text-white">
      <section className="flex flex-col md:flex-row gap-8 p-8">
        <Image src={imageUrl} alt={getTitle(media)} width={256} height={384} className="w-64 h-96 rounded-lg shadow-lg" />
        <div>
          <h1 className="text-4xl font-bold mb-2">{getTitle(media)}</h1>
          <p className="text-gray-400 mb-4">{getField<string>(media, 'release_date') ?? ''} &bull; {getField<string>(media, 'developer') ?? getField<string>(media, 'author') ?? ''}</p>
          <div className="mb-6">{getField<string>(media, 'description') ?? ''}</div>
        </div>
      </section>
      <section className="p-8">
        <h2 className="text-2xl font-semibold mb-4">Similar To</h2>
        <MediaCarousel title="" items={similar} />
      </section>
    </main>
  );
}
