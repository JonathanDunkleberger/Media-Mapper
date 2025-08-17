// ...existing code...

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const saltRounds = 10;

// --- DETAILED MEDIA ENDPOINT ---
app.get('/api/details/:mediaType/:id', async (req, res) => {
  const { mediaType, id } = req.params;
  try {
    if (mediaType === 'movie' || mediaType === 'tv') {
      // TMDb detail endpoint with append_to_response
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${process.env.TMDB_API_KEY}&language=en-US&append_to_response=videos,credits,recommendations`;
      const response = await axios.get(tmdbUrl);
      return res.json({ success: true, data: response.data });
    } else if (mediaType === 'game') {
      // IGDB detail query
      try {
        // Step 1: Get an access token from Twitch
        const tokenResponse = await axios.post(
          `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`
        );
        const accessToken = tokenResponse.data.access_token;

        // Step 2: Query IGDB for game details
        const igdbResponse = await axios({
          url: 'https://api.igdb.com/v4/games',
          method: 'POST',
          headers: {
            'Client-ID': process.env.TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${accessToken}`,
          },
          data: `fields name,cover.url,screenshots.url,summary,genres.name,platforms.name,first_release_date,rating,similar_games.name,similar_games.cover.url,similar_games.id,videos.video_id,videos.name,involved_companies.company.name,involved_companies.developer; where id = ${id};`,
        });
        // IGDB returns an array
        if (igdbResponse.data && igdbResponse.data.length > 0) {
          return res.json({ success: true, data: igdbResponse.data[0] });
        } else {
          return res.status(404).json({ success: false, message: 'Game not found.' });
        }
      } catch (igdbErr) {
        console.error('IGDB error:', igdbErr.response ? igdbErr.response.data : igdbErr.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch game details.' });
      }
    } else if (mediaType === 'book') {
      // Google Books API detail endpoint
      try {
        const booksUrl = `https://www.googleapis.com/books/v1/volumes/${id}?key=${process.env.GOOGLE_BOOKS_API_KEY}`;
        const response = await axios.get(booksUrl);
        const item = response.data;
        const book = {
          id: item.id,
          title: item.volumeInfo.title,
          authors: item.volumeInfo.authors,
          cover_image_url: item.volumeInfo.imageLinks?.thumbnail || '',
          publishedDate: item.volumeInfo.publishedDate,
          description: item.volumeInfo.description,
        };
        return res.json({ success: true, data: book });
      } catch (bookErr) {
        console.error('Google Books error:', bookErr.response ? bookErr.response.data : bookErr.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch book details.' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Invalid mediaType' });
    }
  } catch (err) {
    console.error('Error in /api/details:', err.response ? err.response.data : err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch details.' });
  }
});

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- AUTHENTICATION ROUTES ---
// (Your existing /signup and /login routes are here)
app.post('/signup', async (req, res) => { /* ... existing signup code ... */ });
app.post('/login', async (req, res) => { /* ... existing login code ... */ });

// --- AUTHENTICATION MIDDLEWARE ---
const authenticateToken = (req, res, next) => { /* ... existing middleware code ... */ };

// --- SECURE FAVORITES ROUTES ---
app.get('/api/favorites', authenticateToken, async (req, res) => { /* ... existing favorites code ... */ });
app.post('/api/favorites', authenticateToken, async (req, res) => { /* ... existing favorites code ... */ });


// --- PUBLIC DATA ROUTES ---

// TMDb route for movies (no changes)
app.get('/popular/movies', async (req, res) => {
  try {
    const tmdbUrl = `https://api.themoviedb.org/3/movie/popular?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=1`;
    const response = await axios.get(tmdbUrl);
    res.json({ success: true, movies: response.data.results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch popular movies.' });
  }
});

// TMDb route for TV/Anime
app.get('/popular/tv', async (req, res) => {
  try {
    const tmdbUrl = `https://api.themoviedb.org/3/tv/popular?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=1`;
    const response = await axios.get(tmdbUrl);
    res.json({ success: true, tv: response.data.results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch popular TV shows.' });
  }
});

// Google Books API for popular books (basic example)
app.get('/popular/books', async (req, res) => {
  try {
    const booksUrl = `https://www.googleapis.com/books/v1/volumes?q=bestseller&orderBy=relevance&maxResults=20&key=${process.env.GOOGLE_BOOKS_API_KEY}`;
    const response = await axios.get(booksUrl);
    // Transform to a simpler format
    const books = response.data.items.map(item => ({
      id: item.id,
      title: item.volumeInfo.title,
      authors: item.volumeInfo.authors,
      cover_image_url: item.volumeInfo.imageLinks?.thumbnail || '',
      publishedDate: item.volumeInfo.publishedDate,
      description: item.volumeInfo.description,
    }));
    res.json({ success: true, books });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch popular books.' });
  }
});

// ** NEW: IGDB route for games **
app.get('/popular/games', async (req, res) => {
  try {
    // Step 1: Get an access token from Twitch
    const tokenResponse = await axios.post(
      `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`
    );
    const accessToken = tokenResponse.data.access_token;

    // Step 2: Use the access token to query the IGDB API
    // This query gets top-rated games with covers and screenshots
    const igdbResponse = await axios({
      url: "https://api.igdb.com/v4/games",
      method: 'POST',
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
      data: 'fields name, cover.url, screenshots.url, rating; where rating > 85 & cover.url != null & screenshots.url != null; sort rating desc; limit 20;'
    });
    
    res.json({ success: true, games: igdbResponse.data });

  } catch (err) {
    console.error("Error fetching from IGDB:", err.response ? err.response.data : err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch popular games.' });
  }
});


// --- SERVER START ---
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});