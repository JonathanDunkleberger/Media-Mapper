'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { MediaDetailHero } from '../../../components/MediaDetailHero';
import { TrailerCarousel } from '../../../components/TrailerCarousel';
import type { KnownMedia } from '../../../types/media';

export default function MediaDetailPage() {
  const params = useParams();
  const { mediaType, id } = params as { mediaType: string; id: string };
  const [data, setData] = useState<KnownMedia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
  fetch(`http://localhost:3001/api/details/${mediaType}/${id}`)
      .then(res => res.json())
      .then(json => {
  if (json.success) setData(json.data as KnownMedia);
        else setError(json.message || 'Not found');
      })
      .catch(() => setError('Failed to fetch details.'))
      .finally(() => setLoading(false));
  }, [mediaType, id]);

  if (loading) return <div className="text-center py-20 text-xl">Loading...</div>;
  if (error) return <div className="text-center py-20 text-red-500">{error}</div>;
  if (!data) return null;

  return (
    <main className="bg-black min-h-screen text-white">
  <MediaDetailHero data={data} mediaType={mediaType} />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <TrailerCarousel data={data} mediaType={mediaType} />
        {/* Add more carousels or sections as needed */}
      </div>
    </main>
  );
}
