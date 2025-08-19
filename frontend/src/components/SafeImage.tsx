"use client";
import Image from 'next/image';
import { useState } from 'react';

export function SafeImage(props: { src?: string | null; alt: string; w: number; h: number; className?: string }) {
  const { src, alt, w, h, className } = props;
  const [broken, setBroken] = useState(false);
  const finalSrc = !src || broken ? '/placeholder-poster.png' : src;
  return (
    <Image
      src={finalSrc}
      alt={alt}
      width={w}
      height={h}
      className={className}
      onError={() => setBroken(true)}
    />
  );
}
