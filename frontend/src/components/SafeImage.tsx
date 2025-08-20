"use client";
import Image, { ImageProps } from 'next/image';
import { useState, useMemo } from 'react';

interface SafeImageProps {
  src?: string | null;
  alt: string;
  w: number;
  h: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  fallbackSrc?: string;
  blurDataURL?: string;
}

// Robust image component with multi-source fallback & optional blur placeholder
export function SafeImage({
  src,
  alt,
  w,
  h,
  className,
  priority,
  sizes,
  fallbackSrc = '/placeholder-poster.png',
  blurDataURL = '/placeholder-poster.png'
}: SafeImageProps) {
  const [broken, setBroken] = useState(false);
  const resolved = useMemo(() => {
    if (!src || broken) return fallbackSrc;
    return src;
  }, [src, broken, fallbackSrc]);
  return (
    <Image
      src={resolved}
      alt={alt || 'Media'}
      width={w}
      height={h}
      className={className}
      priority={priority}
      sizes={sizes}
      placeholder="blur"
      blurDataURL={blurDataURL}
      onError={(e) => {
        if (!broken) setBroken(true);
      }}
    />
  );
}

// Convenience wrapper for full media object with multiple potential path fields
export function MediaImage({ item, className, w = 300, h = 450 }: { item: any; className?: string; w?: number; h?: number }) {
  const src = item?.posterUrl || item?.backdropUrl || item?.coverUrl || item?.image || item?.img || null;
  return (
    <SafeImage
      src={src}
      alt={item?.title || item?.name || 'Media'}
      w={w}
      h={h}
      className={className}
    />
  );
}
