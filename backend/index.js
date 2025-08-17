const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { HowLongToBeatService } = require('howlongtobeat');
require('dotenv').config();

const db = require('./db');


// --- SETUP & INITIALIZATION ---
const app = express();
const hltbService = new HowLongToBeatService();
const PORT = process.env.PORT || 3001;
const saltRounds = 10;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());


// --- AUTHENTICATION ROUTES ---
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }
  if (!db.isDbAvailable || !db.isDbAvailable()) {
    return res.status(503).json({ success: false, message: 'Service unavailable: database not connected.' });
  }
  try {
    const password_hash = await bcrypt.hash(password, saltRounds);
    const result = await db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, password_hash]
    );
    res.status(201).json({ success: true, user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'User with this email already exists.' });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error during user creation.' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }
  if (!db.isDbAvailable || !db.isDbAvailable()) {
    return res.status(503).json({ success: false, message: 'Service unavailable: database not connected.' });
  }
  try {
    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }
    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ success: true, token: token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// --- AUTHENTICATION MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};



// --- SECURE FAVORITES ROUTES ---
app.get('/api/favorites', authenticateToken, async (req, res) => {
  if (!db.isDbAvailable || !db.isDbAvailable()) {
    return res.status(503).json({ success: false, message: 'Service unavailable: database not connected.' });
  }
  try {
    const result = await db.query(
      'SELECT media_type, external_media_id, created_at FROM user_favorites WHERE user_id = $1',
      [req.user.userId]
    );
    res.json({ success: true, favorites: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error fetching favorites.' });
  }
});

app.post('/api/favorites', authenticateToken, async (req, res) => {
  const { media_type, external_media_id } = req.body;
  if (!media_type || !external_media_id) {
    return res.status(400).json({ success: false, message: 'Media type and ID are required.' });
  }
  if (!db.isDbAvailable || !db.isDbAvailable()) {
    return res.status(503).json({ success: false, message: 'Service unavailable: database not connected.' });
  }
  try {
    const result = await db.query(
      'INSERT INTO user_favorites (user_id, media_type, external_media_id) VALUES ($1, $2, $3) RETURNING *',
      [req.user.userId, media_type, external_media_id]
    );
    res.status(201).json({ success: true, favorite: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'This item is already in your favorites.' });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error adding favorite.' });
  }
});


// --- PUBLIC DATA ROUTES ---

// Popular Movies
app.get('/popular/movies', async (req, res) => {
  try {
    const tmdbUrl = `https://api.themoviedb.org/3/movie/popular?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=1`;
    const response = await axios.get(tmdbUrl);
    const movies = response.data.results.map(movie => ({
      type: 'movie',
      id: movie.id,
      title: movie.title,
      overview: movie.overview,
      backdrop_path: movie.backdrop_path,
      poster_path: movie.poster_path,
    }));
    res.json({ success: true, movies });
  } catch (err) {
    // Detailed logging for TMDb errors
    try {
      if (err.response) {
        console.error('🔴 TMDb API error in /popular/movies:', {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data,
        });
      } else {
        console.error('🔴 Error in /popular/movies:', err.message);
      }
    } catch (logErr) {
      console.error('🔴 Error while logging TMDb failure:', logErr);
    }
    // Return minimal error to client
    res.status(500).json({ success: false, message: 'Failed to fetch popular movies.' });
  }
});

// Popular TV & Anime
app.get('/popular/tv', async (req, res) => {
  try {
    const tmdbUrl = `https://api.themoviedb.org/3/tv/popular?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=1`;
    const response = await axios.get(tmdbUrl);
    const tv = response.data.results.map(show => ({
      type: 'tv',
      id: show.id,
      name: show.name,
      overview: show.overview,
      backdrop_path: show.backdrop_path,
      poster_path: show.poster_path,
    }));
    res.json({ success: true, tv });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch popular TV shows.' });
  }
});

// Popular Books
app.get('/popular/books', async (req, res) => {
  try {
    const booksUrl = `https://www.googleapis.com/books/v1/volumes?q=bestseller&orderBy=relevance&maxResults=20&key=${process.env.GOOGLE_BOOKS_API_KEY}`;
    const response = await axios.get(booksUrl);
    const books = response.data.items.map(item => ({
      type: 'book',
      key: item.id,
      title: item.volumeInfo.title,
      author: item.volumeInfo.authors ? item.volumeInfo.authors[0] : 'Unknown',
      imageLinks: item.volumeInfo.imageLinks || {},
    }));
    res.json({ success: true, books });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch popular books.' });
  }
});

// Popular Games
app.get('/popular/games', async (req, res) => {
  try {
    const tokenResponse = await axios.post(`https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`);
    const accessToken = tokenResponse.data.access_token;
    const igdbResponse = await axios({
      url: "https://api.igdb.com/v4/games",
      method: 'POST',
      headers: { 'Client-ID': process.env.TWITCH_CLIENT_ID, 'Authorization': `Bearer ${accessToken}` },
      data: 'fields id, name, cover.url, rating; where rating > 85 & cover.url != null; sort rating desc; limit 20;'
    });
    const games = igdbResponse.data.map(game => ({
      type: 'game',
      id: game.id,
      name: game.name,
      background_image: game.cover ? game.cover.url.replace('t_thumb', 't_cover_big') : '',
    }));
    res.json({ success: true, games });
  } catch (err) {
    console.error('Error in /popular/games:', err.response ? err.response.data : err.message, err.stack);
    res.status(500).json({ success: false, message: 'Failed to fetch popular games.', error: err.response ? err.response.data : err.message });
  }
});


// --- DETAILED MEDIA ENDPOINT ---
app.get('/api/details/:mediaType/:id', async (req, res) => {
  const { mediaType, id } = req.params;
  try {
    let details = {};
    if (mediaType === 'movie' || mediaType === 'tv') {
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${process.env.TMDB_API_KEY}&append_to_response=videos,credits,recommendations`;
      const response = await axios.get(tmdbUrl);
      details = response.data;
    } else if (mediaType === 'game') {
      // --- IGDB & HLTB MASHUP LOGIC ---
      const tokenResponse = await axios.post(`https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`);
      const accessToken = tokenResponse.data.access_token;

      const igdbResponse = await axios({
        url: "https://api.igdb.com/v4/games",
        method: 'POST',
        headers: { 'Client-ID': process.env.TWITCH_CLIENT_ID, 'Authorization': `Bearer ${accessToken}` },
        data: `fields name, summary, cover.url, genres.name, platforms.name, aggregated_rating, rating, websites.url, websites.category, involved_companies.company.name; where id = ${id};`
      });
      
      const gameData = igdbResponse.data[0];
      if (!gameData) {
        return res.status(404).json({ success: false, message: 'Game not found.' });
      }

      const hltbData = await hltbService.search(gameData.name);
      details = { ...gameData, howlongtobeat: hltbData[0] || null };
    } else if (mediaType === 'book') {
        const booksUrl = `https://www.googleapis.com/books/v1/volumes/${id}?key=${process.env.GOOGLE_BOOKS_API_KEY}`;
        const response = await axios.get(booksUrl);
        details = response.data;
    } else {
        return res.status(400).json({ success: false, message: 'Invalid mediaType' });
    }
    res.json({ success: true, details: details });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch details.' });
  }
});


// --- PERSONALIZED RECOMMENDATIONS ENDPOINT ---
app.post('/api/recommendations', async (req, res) => {
    // This is still a placeholder and will be the next major feature to build.
    const inLoveList = req.body.inLoveList || [];
    res.json({ success: true, message: "Recommendation logic not yet implemented.", received: inLoveList });
});


// --- SERVER START ---
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});