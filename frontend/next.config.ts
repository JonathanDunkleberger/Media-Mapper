import type { NextConfig } from 'next';

const config: NextConfig = {
  images: {
    domains: [
      'image.tmdb.org',
      'images.igdb.com',
      'books.google.com',
      'lh3.googleusercontent.com'
    ],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      path: false,
      os: false,
      child_process: false,
      net: false,
      tls: false
    };
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true, // Temporary for debugging
  },
  typescript: {
    ignoreBuildErrors: true, // Temporary for debugging
  },
  serverExternalPackages: ['sharp', 'onnxruntime-node']
};

export default config;
