const isStabilityMode = process.env.NEXT_PUBLIC_STABILITY_MODE === '1';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Per stability mode request
  images: {
    unoptimized: isStabilityMode, // Per stability mode request
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org' },
      { protocol: 'https', hostname: 'images.igdb.com' },
      { protocol: 'https', hostname: 'books.googleusercontent.com' },
      // Fallbacks kept for existing content or transitional assets:
      { protocol: 'https', hostname: 'covers.openlibrary.org' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ]
  },
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
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' vercel.live",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://image.tmdb.org https://api.themoviedb.org https://api.igdb.com https://id.twitch.tv https://books.googleapis.com",
      "font-src 'self' data:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');

    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
            // NOTE: tighten this in production by computing allowed origin list
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' }
        ]
      },
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
        ]
      }
    ];
  }
};

export default nextConfig;
