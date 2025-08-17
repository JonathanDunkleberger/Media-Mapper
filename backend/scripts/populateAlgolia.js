// backend/scripts/populateAlgolia.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const algoliasearch = require('algoliasearch');
const axios = require('axios');

// --- Initialization ---
const algoliaClient = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_ADMIN_KEY);
const index = algoliaClient.initIndex('media_mapper_titles');

// Helper: sleep for rate-limit friendly pacing
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Data Fetching & Normalizing Functions ---

async function fetchMovies({ pages = 10 } = {}) {
  console.log('Fetching movies from TMDB...');
  const results = [];
  for (let page = 1; page <= pages; page++) {
    try {
      const url = `https://api.themoviedb.org/3/movie/popular?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=${page}`;
      const res = await axios.get(url);
      for (const item of res.data.results || []) {
        results.push({
          objectID: `movie_${item.id}`,
          external_id: item.id,
          title: item.title,
          media_type: 'movie',
          category: 'Movie',
          cover_image_url: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
          popularity: item.popularity || 0,
          rating: item.vote_average || 0,
        });
      }
    } catch (err) {
      console.warn(`Warning: TMDB movies page ${page} failed:`, err.message);
    }
    // be polite with the API
    await sleep(250);
  }
  return results;
}

async function fetchTVShows({ pages = 10 } = {}) {
  console.log('Fetching TV shows from TMDB...');
  const results = [];
  for (let page = 1; page <= pages; page++) {
    try {
      const url = `https://api.themoviedb.org/3/tv/popular?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=${page}`;
      const res = await axios.get(url);
      for (const item of res.data.results || []) {
        results.push({
          objectID: `tv_${item.id}`,
          external_id: item.id,
          title: item.name,
          media_type: 'tv',
          category: 'TV',
          cover_image_url: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
          popularity: item.popularity || 0,
          rating: item.vote_average || 0,
        });
      }
    } catch (err) {
      console.warn(`Warning: TMDB tv page ${page} failed:`, err.message);
    }
    await sleep(250);
  }
  return results;
}

async function fetchGames({ limit = 200 } = {}) {
  console.log('Fetching games from IGDB (via Twitch)...');
  // Get token
  const tokenResponse = await axios.post(`https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`);
  const accessToken = tokenResponse.data.access_token;

  // IGDB accepts a single query; request top 'limit' by popularity and include rating
  const igdbQuery = `fields name, cover.url, aggregated_rating, first_release_date; where cover != null; sort aggregated_rating desc; limit ${limit};`;
  try {
    const res = await axios({
      url: 'https://api.igdb.com/v4/games',
      method: 'POST',
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
      data: igdbQuery,
    });

    return (res.data || [])
      .filter((g) => g.name && g.cover && g.cover.url)
      .map((g) => ({
        objectID: `game_${g.id}`,
        external_id: g.id,
        title: g.name,
        media_type: 'game',
        category: 'Video Game',
        cover_image_url: g.cover.url.replace('t_thumb', 't_cover_big'),
        popularity: g.popularity || 0,
        rating: g.aggregated_rating || 0,
      }));
  } catch (err) {
    console.error('IGDB fetch failed:', err.response ? err.response.data : err.message);
    return [];
  }
}

async function fetchBooks({ queries = [], maxPerQuery = 40 } = {}) {
  console.log('Fetching books from Google Books...');
  const defaultQueries = ['harry potter', 'lord of the rings', 'dune', 'foundation', 'game of thrones', 'ready player one', 'ender\'s game', 'the witcher'];
  const searchQueries = queries.length ? queries : defaultQueries;
  const results = [];

  for (const q of searchQueries) {
    try {
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=${maxPerQuery}&key=${process.env.GOOGLE_BOOKS_API_KEY}`;
      const res = await axios.get(url);
      for (const item of (res.data.items || [])) {
        const vid = item.id;
        const vol = item.volumeInfo || {};
        results.push({
          objectID: `book_${vid}`,
          external_id: vid,
          title: vol.title || 'Unknown',
          media_type: 'book',
          category: 'Book',
          cover_image_url: vol.imageLinks?.thumbnail || '',
          authors: vol.authors || [],
        });
      }
    } catch (err) {
      console.warn(`Warning: Google Books query '${q}' failed:`, err.message);
    }
    await sleep(150);
  }

  // Deduplicate by objectID
  const seen = new Map();
  for (const r of results) {
    if (!seen.has(r.objectID)) seen.set(r.objectID, r);
  }
  return Array.from(seen.values());
}

// --- Main Script Logic ---
async function populateAlgolia() {
  try {
    const [movies, tvShows, games, books] = await Promise.all([
      fetchMovies({ pages: 10 }),
      fetchTVShows({ pages: 10 }),
      fetchGames({ limit: 200 }),
      fetchBooks({}),
    ]);

    let allRecords = [...movies, ...tvShows, ...games, ...books];

    // Normalize/clean titles and ensure required fields
    allRecords = allRecords.map((r) => ({
      objectID: r.objectID,
      title: r.title || r.name || '',
      media_type: r.media_type || (r.category ? r.category.toLowerCase() : ''),
      category: r.category || '',
      cover_image_url: r.cover_image_url || '',
      external_id: r.external_id || null,
      popularity: r.popularity || 0,
      rating: r.rating || 0,
      authors: r.authors || [],
    }));

    // Deduplicate by objectID
    const byId = new Map();
    for (const rec of allRecords) byId.set(rec.objectID, rec);
    const uniqueRecords = Array.from(byId.values());
    console.log(`\nTotal unique records to be indexed: ${uniqueRecords.length}`);

    // Configure index settings for better search relevance
    console.log('Updating Algolia index settings...');
    await index.setSettings({
      searchableAttributes: ['title', 'unordered(category)', 'unordered(media_type)'],
      attributesForFaceting: ['category', 'media_type'],
      customRanking: ['desc(popularity)', 'desc(rating)'],
      attributesToRetrieve: ['title', 'cover_image_url', 'category', 'media_type', 'external_id'],
    });

    // Clear existing index (optional) and push in chunks
    console.log('Clearing existing Algolia index...');
    await index.clearObjects();

    const chunkSize = 500; // safe chunk size
    for (let i = 0; i < uniqueRecords.length; i += chunkSize) {
      const batch = uniqueRecords.slice(i, i + chunkSize);
      console.log(`Indexing batch ${i / chunkSize + 1} (${batch.length} records)...`);
      await index.saveObjects(batch);
      // small pause to avoid throttling
      await sleep(300);
    }

    console.log(`✅ Successfully indexed ${uniqueRecords.length} records to Algolia.`);
  } catch (error) {
    console.error('🔴 Error populating Algolia:', error.response ? error.response.data : error.message);
    process.exit(1);
  }
}

populateAlgolia();