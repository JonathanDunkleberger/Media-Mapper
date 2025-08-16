const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const saltRounds = 10;

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