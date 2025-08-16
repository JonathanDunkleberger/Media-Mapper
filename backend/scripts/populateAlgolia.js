// backend/scripts/populateAlgolia.js

// --- START DEBUGGING SECTION ---
const path = require('path');
const envPath = path.resolve(__dirname, '../.env');
console.log('Attempting to load .env file from this path:', envPath);
require('dotenv').config({ path: envPath });
console.log('Value for TMDB_API_KEY after load:', process.env.TMDB_API_KEY);
// --- END DEBUGGING SECTION ---

const algoliasearch = require('algoliasearch');
const axios = require('axios');

async function populateAlgolia() {
  try {
    // --- 1. INITIALIZE CLIENTS ---
    if (!process.env.ALGOLIA_APP_ID || !process.env.ALGOLIA_ADMIN_KEY || !process.env.TMDB_API_KEY) {
      throw new Error('Missing API keys in .env file');
    }

    const algoliaClient = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_ADMIN_KEY);
    const index = algoliaClient.initIndex('media_mapper_titles');
    console.log('Algolia client initialized.');

    // --- 2. FETCH MOVIE DATA FROM TMDB ---
    const tmdbUrl = `https://api.themoviedb.org/3/movie/popular?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=1`;
    const response = await axios.get(tmdbUrl);
    const movies = response.data.results;
    console.log(`Fetched ${movies.length} popular movies from TMDb.`);

    // --- 3. TRANSFORM DATA FOR ALGOLIA ---
    const records = movies.map(movie => ({
      objectID: `movie_${movie.id}`,
      title: movie.title,
      category: 'Movie',
      cover_image_url: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
      release_date: movie.release_date,
      rating: movie.vote_average,
    }));
    console.log('Transformed movie data for Algolia.');

    // --- 4. PUSH DATA TO ALGOLIA ---
    const { objectIDs } = await index.saveObjects(records);
    console.log(`✅ Successfully pushed ${objectIDs.length} records to Algolia.`);

  } catch (error) {
    console.error('🔴 Error populating Algolia:', error);
  }
}

populateAlgolia();