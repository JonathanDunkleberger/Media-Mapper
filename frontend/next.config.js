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
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' }, // TODO: restrict in production
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
