"use client";
import Image from 'next/image';
import { useState } from 'react';

export interface SafeImageProps {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
}

export function SafeImage({ src, alt, width, height, className, priority }: SafeImageProps) {
  const [broken, setBroken] = useState(false);
  const valid = !!src && !broken;
  return valid ? (
    <Image
      src={src!}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      onError={() => setBroken(true)}
    />
  ) : (
    <Image
      src="/placeholder-poster.png"
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  );
}
