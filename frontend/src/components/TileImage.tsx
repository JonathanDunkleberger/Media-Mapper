/* eslint-disable @next/next/no-img-element */
"use client";

import { apiUrl } from "@/lib/apiUrl";
import React from "react";

// Allow normal <img> props, but we control src/alt defaults.
type ImgProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  src?: string | null;
  alt: string;
};

function normalize(raw?: string | null) {
  if (!raw) return "";
  const s = raw.trim();
  if (!s) return "";
  if (s.startsWith("http://")) return "https://" + s.slice(7);
  // TMDB shorthand like /t/... /p/... /w500/...
  if (s.startsWith("/t/") || s.startsWith("/p/") || /^\/w\d+\//.test(s)) {
    return "https://image.tmdb.org" + s;
  }
  return s;
}

export default function TileImage({
  src,
  alt,
  width = 300,
  height = 450,
  className,
  loading = "lazy",
  decoding = "async",
  ...rest
}: ImgProps) {
  const fixed = normalize(src);
  const finalSrc = apiUrl(`/api/img?u=${encodeURIComponent(fixed)}`);

  return (
    <img
      src={finalSrc}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      decoding={decoding}
      className={className}
      style={{ width: "100%", height: "auto", display: "block", ...(rest.style || {}) }}
      {...rest}
    />
  );
}
