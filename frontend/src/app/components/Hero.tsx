import Image from 'next/image';
import Link from 'next/link';
import { Info, PlusCircle } from 'lucide-react';

// Define the shape of the data the component expects
interface HeroProps {
  featuredItem: {
    id: number;
    category: 'movie' | 'tv' | 'game' | 'book' | 'anime';
    title: string;
    overview: string;
    backdropUrl: string;
    contentRating?: string; // e.g., "PG-13"
  };
}

export function Hero({ featuredItem }: HeroProps) {
  // Truncate the overview to a reasonable length
  const truncatedOverview =
    featuredItem.overview.length > 250
      ? `${featuredItem.overview.substring(0, 250)}...`
      : featuredItem.overview;

  return (
    <section className="relative h-[65vh] w-full text-white">
      {/* Background Image */}
      <Image
        src={featuredItem.backdropUrl}
        alt={`Backdrop for ${featuredItem.title}`}
        fill
        className="object-cover"
        priority // Load this image first as it's above the fold
      />

      {/* Gradient Overlay for Text Legibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col justify-center p-8 md:p-12 lg:p-24">
        <div className="max-w-xl">
          <h1 className="text-4xl font-bold md:text-5xl lg:text-6xl">
            {featuredItem.title}
          </h1>
          <p className="mt-4 text-sm text-text-secondary md:text-base">
            {truncatedOverview}
          </p>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center gap-4">
            <button className="flex items-center gap-2 rounded-lg bg-accent-primary px-6 py-3 font-semibold transition hover:bg-accent-hover">
              <PlusCircle size={20} />
              Add to Library
            </button>
            <Link
              href={`/detail/${featuredItem.category}/${featuredItem.id}`}
              className="flex items-center gap-2 rounded-lg bg-white/20 px-6 py-3 font-semibold transition hover:bg-white/30"
            >
              <Info size={20} />
              More Info
            </Link>
          </div>
        </div>
      </div>

      {/* Content Rating Pill (conditionally rendered) */}
      {featuredItem.contentRating && (
        <div className="absolute bottom-8 right-8 z-10 rounded-md border border-white/50 bg-black/50 px-3 py-1 text-sm font-semibold">
          {featuredItem.contentRating}
        </div>
      )}
    </section>
  );
}
