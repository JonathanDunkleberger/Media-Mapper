/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Explicit allow-list for remote images used in cards & thumbnails
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org' }, // TMDB posters/backdrops
      { protocol: 'https', hostname: 'images.igdb.com' }, // IGDB game covers
      { protocol: 'https', hostname: 'books.googleusercontent.com' }, // Google Books
      { protocol: 'https', hostname: 'covers.openlibrary.org' }, // OpenLibrary fallback
      { protocol: 'https', hostname: 'i.ytimg.com' }, // YouTube trailer thumbs
    ],
    // Disable static image imports optimization side-effects for now (keeps things simple)
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"
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
    const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
    const csp = [
      "default-src 'self'",
      // Allow Vercel live reload script in preview, inline for Next.js runtime, no remote eval CDNs
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' vercel.live",
      "style-src 'self' 'unsafe-inline'",
      // Allow all https images plus data/blob for next/image blur placeholders
      `img-src 'self' data: blob: https://image.tmdb.org https://images.igdb.com https://books.googleusercontent.com https://covers.openlibrary.org https://i.ytimg.com ${vercelUrl}`,
      // Add the actual API origins needed for fetch (TMDB (api+image), IGDB (api via twitch), Twitch ID auth, Google Books)
      // Also include the Vercel deployment URL for self-hosted API calls.
      `connect-src 'self' https://api.themoviedb.org https://image.tmdb.org https://api.igdb.com https://id.twitch.tv https://books.googleapis.com ${vercelUrl}`,
      "font-src 'self' data:",
      // Allow Vercel live/preview comments to be framed.
      "frame-src 'self' https://vercel.live",
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

module.exports = nextConfig;
