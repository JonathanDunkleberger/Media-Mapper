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
      // Games (IGDB)
      { protocol: 'https', hostname: 'images.igdb.com' },
      // YouTube thumbnails
      { protocol: 'https', hostname: 'i.ytimg.com' }
    ]
    // To bypass optimizer temporarily, you can add: , unoptimized: true
  }
};

module.exports = nextConfig;
