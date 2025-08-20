/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Movies / TV (TMDB)
      { protocol: 'https', hostname: 'image.tmdb.org' },
      // Amazon posters
      { protocol: 'https', hostname: 'm.media-amazon.com' },
      // Anime / MAL
      { protocol: 'https', hostname: 'cdn.myanimelist.net' },
      // Books (Open Library)
      { protocol: 'https', hostname: 'covers.openlibrary.org' },
      // Google Books
      { protocol: 'https', hostname: 'books.googleusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // Games (IGDB)
      { protocol: 'https', hostname: 'images.igdb.com' },
      // YouTube thumbnails
      { protocol: 'https', hostname: 'i.ytimg.com' },
      // RAWG (games)
      { protocol: 'https', hostname: 'media.rawg.io' }
    ]
    // To bypass optimizer temporarily, you can add: , unoptimized: true
  },
  async redirects() {
    return [
      {
        source: '/:mediaType/:id',
        destination: '/details/:mediaType/:id',
        permanent: true,
      },
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

module.exports = nextConfig;
