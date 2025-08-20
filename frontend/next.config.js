const isProd = process.env.NODE_ENV === 'production';

const CSP_PROD = [
  "default-src 'self'",
  "base-uri 'self'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https://image.tmdb.org https://images.igdb.com https://books.googleusercontent.com https://*.supabase.co https://*.supabase.in",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://api.themoviedb.org https://image.tmdb.org https://api.igdb.com https://id.twitch.tv https://*.supabase.co https://*.supabase.in https://books.googleapis.com",
  "frame-ancestors 'self'",
  "worker-src 'self' blob:"
].join('; ');

const CSP_PREVIEW = [
  "default-src 'self' https://vercel.live",
  "base-uri 'self'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https://image.tmdb.org https://images.igdb.com https://books.googleusercontent.com https://*.supabase.co https://*.supabase.in",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://*.vercel.app https://*.vercel.live https://api.themoviedb.org https://image.tmdb.org https://api.igdb.com https://id.twitch.tv https://*.supabase.co https://*.supabase.in https://books.googleapis.com",
  "frame-src 'self' https://vercel.live",
  "frame-ancestors 'self' https://vercel.live",
  "worker-src 'self' blob:"
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/api/popular/book', destination: '/api/popular/books' },
      { source: '/api/popular/book/:path*', destination: '/api/popular/books/:path*' },
      { source: '/api/popular/movie', destination: '/api/popular/movies' },
      { source: '/api/popular/movie/:path*', destination: '/api/popular/movies/:path*' },
      { source: '/api/popular/game', destination: '/api/popular/games' },
      { source: '/api/popular/game/:path*', destination: '/api/popular/games/:path*' },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: isProd ? CSP_PROD : CSP_PREVIEW },
        ],
      },
    ];
  },
  images: {
    // Make preview builds show images no matter what; keep optimization in prod.
    unoptimized: !isProd,
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org' },
      { protocol: 'https', hostname: 'images.igdb.com' },
      { protocol: 'https', hostname: 'books.googleusercontent.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.in' },
    ],
  },
};

module.exports = nextConfig;

