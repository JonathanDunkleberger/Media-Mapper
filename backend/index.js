// --- Global Media Map API ---
const { fetchGlobalTopMovies } = require('./globalMap');

app.get('/api/global-map-movies', async (req, res) => {
  console.log('[API] /api/global-map-movies called', {
    TMDB_API_KEY: !!process.env.TMDB_API_KEY
  });
  try {
    const movies = await fetchGlobalTopMovies();
    res.json({ movies });
  } catch (e) {
    console.error('Global map movies error', e);
    res.status(500).json({ error: 'Failed to fetch global map movies' });
  }
});
// --- Early runtime diagnostics (added for crash isolation) ---
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  // Force exit so supervising tools notice failure instead of silent hang
  process.exit(1);
});
process.on('exit', (code) => {
  console.log('Process exiting with code:', code);
});

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const db = require('./db');
const { supabase } = require('./supabaseClient');
const jwt = require('jsonwebtoken');
// --- Favorites Auth Middleware and Endpoints ---
// Middleware to verify Supabase JWT and get user id
async function requireUser(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  const token = auth.replace('Bearer ', '');
  try {
    // Supabase JWTs are signed with the project's JWT secret
    const { sub: user_id } = jwt.decode(token) || {};
    if (!user_id) throw new Error('Invalid token');
    req.user = { id: user_id };
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Add a favorite
app.post('/api/favorites', requireUser, async (req, res) => {
  console.log('[API] /api/favorites POST called', {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  });
  const { media_id } = req.body;
  if (!media_id) return res.status(400).json({ error: 'Missing media_id' });
  const { id: user_id } = req.user;
  try {
    const { data, error } = await supabase
      .from('favorites')
      .insert([{ user_id, media_id }])
      .select();
    if (error) throw error;
    res.json({ favorite: data[0] });
  } catch (e) {
    console.error('Add favorite error', e);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

// Remove a favorite
app.delete('/api/favorites/:media_id', requireUser, async (req, res) => {
  console.log('[API] /api/favorites DELETE called', {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  });
  const { id: user_id } = req.user;
  const { media_id } = req.params;
  try {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user_id)
      .eq('media_id', media_id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error('Delete favorite error', e);
    res.status(500).json({ error: 'Failed to delete favorite' });
  }
});

// Get all favorites for the current user
app.get('/api/favorites', requireUser, async (req, res) => {
  console.log('[API] /api/favorites GET called', {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  });
  const { id: user_id } = req.user;
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('media_id, media(*)')
      .eq('user_id', user_id);
    if (error) throw error;
    res.json({ favorites: data });
  } catch (e) {
    console.error('Get favorites error', e);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

const app = express();

// --- CORS Configuration ---
// Goal: Be permissive in development to eliminate friction; tighten automatically in production.
// Supports comma‑separated FRONTEND_ORIGINS / FRONTEND_ORIGIN env vars.
const DEV_MODE = (process.env.NODE_ENV || '').toLowerCase() !== 'production';

function parseOrigins() {
  const raw = process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN || '';
  if (!raw) return [];
  return raw.split(/[,\s]+/).map(o => o.trim()).filter(Boolean);
}
function normalizeOrigin(o) { return (o || '').replace(/\/$/, '').toLowerCase(); }

const staticOrigins = [
  'http://localhost:3000','http://localhost:3001','http://localhost:3002','http://localhost:3010',
  'http://localhost:3025','http://localhost:3026','http://localhost:3027','http://localhost:3028'
];
const configuredOrigins = [...new Set([...parseOrigins(), ...staticOrigins])];
const normalizedConfigured = new Set(configuredOrigins.map(normalizeOrigin));

app.use((req, _res, next) => { req._requestStart = Date.now(); next(); });

// Simplified permissive CORS per request (allows all origins in dev)
app.use(cors());

// Optional debug endpoint to introspect CORS configuration (disabled by default in production)
app.get('/__cors_debug', (req, res) => {
  if (!DEV_MODE && process.env.ENABLE_CORS_DEBUG !== '1') return res.status(404).end();
  res.json({
    devMode: DEV_MODE,
    originHeader: req.headers.origin || null,
    configuredOrigins,
    normalizedConfigured: Array.from(normalizedConfigured),
    prodStrict: process.env.PROD_STRICT === '1'
  });
});

// Explicitly respond to all preflight requests
app.options('*', cors());

app.use(express.json());

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// Heartbeat to verify process liveness (helps diagnose unexpected exits)
setInterval(() => {
  if (process.env.DEBUG_HEARTBEAT === '1') {
    console.log('[heartbeat]', new Date().toISOString());
  }
}, 30000);

// ----- Live External Search Proxy -----
// GET /api/search?q=term&type=movie|tv|game|book
// Falls back to movie if type omitted. No local DB usage.

// Simple in-memory IGDB token cache
let igdbToken = null; let igdbTokenExpiry = 0;
async function getIgdbToken() {
  const now = Date.now();
  if (igdbToken && now < igdbTokenExpiry) return igdbToken;
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Missing Twitch client credentials');
  const params = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' });
  const resp = await fetch('https://id.twitch.tv/oauth2/token', { method: 'POST', body: params });
  if (!resp.ok) throw new Error(`Twitch auth failed ${resp.status}`);
  const json = await resp.json();
  igdbToken = json.access_token; igdbTokenExpiry = Date.now() + (json.expires_in - 60) * 1000; // renew 1m early
  return igdbToken;
}

function yearFrom(dateStr) {
  if (!dateStr) return null; const m = dateStr.match(/\d{4}/); return m ? parseInt(m[0], 10) : null;
}

// --- Simple in-memory cache for popular endpoints (10 min TTL) ---
const POPULAR_TTL = 10 * 60 * 1000; // 10 minutes
const popularCache = {
  movies: { data: null, ts: 0 },
  games: { data: null, ts: 0 },
  tv: { data: null, ts: 0 },
  books: { data: null, ts: 0 }
};

// --- Simple media details cache (no TTL for now) ---
// Keyed by type + id if available, else by normalized title.
// This is intentionally minimal; restart clears it. Extend later with TTL if needed.
const mediaCache = new Map();
function buildMediaCacheKey(type, id, title) {
  const t = (type || '').toString().toLowerCase();
  if (id !== undefined && id !== null && id !== '') return `media:${t}:id:${id}`;
  return `media:${t}:title:${(title || '').toString().toLowerCase()}`;
}
function cacheGet(type, id, title) {
  const key = buildMediaCacheKey(type, id, title);
  if (mediaCache.has(key)) {
    console.log('[cache hit]', key);
    return mediaCache.get(key);
  }
  console.log('[cache miss]', key);
  return null;
}
function cacheSet(type, id, title, obj) {
  const key = buildMediaCacheKey(type, id, title);
  mediaCache.set(key, obj);
}

async function fetchPopularMovies() {
  const now = Date.now();
  if (popularCache.movies.data && (now - popularCache.movies.ts) < POPULAR_TTL) {
    return { data: popularCache.movies.data, cached: true };
  }
  const apiKey = process.env.TMDB_API_KEY; if (!apiKey) return { data: [], cached: false };
  const url = `https://api.themoviedb.org/3/trending/movie/week?api_key=${apiKey}`;
  const r = await fetch(url);
  if (!r.ok) return { data: [], cached: false };
  const json = await r.json();
  const imgBase = 'https://image.tmdb.org/t/p/w500';
  const data = (json.results || []).slice(0, 20).map(item => {
    const title = item.title || item.original_title || '';
    const year = yearFrom(item.release_date);
    const poster = item.poster_path ? imgBase + item.poster_path : null;
    return {
      type: 'movie', media_type: 'movie', external_id: item.id, title,
      cover_image_url: poster, poster_path: poster, release_year: year, overview: item.overview || null
    };
  });
  popularCache.movies = { data, ts: now };
  return { data, cached: false };
}

async function fetchPopularGames() {
  const now = Date.now();
  if (popularCache.games.data && (now - popularCache.games.ts) < POPULAR_TTL) {
    return { data: popularCache.games.data, cached: true };
  }
  // Use IGDB recently released/ popular heuristic (recent first_release_date)
  try {
    const clientId = process.env.TWITCH_CLIENT_ID; if (!clientId) return { data: [], cached: false };
    const token = await getIgdbToken();
    const query = 'fields name, first_release_date, cover.url; sort first_release_date desc; where category = 0 & first_release_date != null; limit 20;';
    const r = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: { 'Client-ID': clientId, 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      body: query
    });
    if (!r.ok) return { data: [], cached: false };
    const json = await r.json();
    const data = json.map(g => {
      let image = g.cover && g.cover.url ? g.cover.url.replace('t_thumb', 't_cover_big') : null;
      if (image && image.startsWith('//')) image = 'https:' + image;
      return {
        type: 'game', media_type: 'game', external_id: g.id, title: g.name || 'Untitled',
        cover_image_url: image, poster_path: image,
        release_year: g.first_release_date ? new Date(g.first_release_date * 1000).getUTCFullYear() : null,
        overview: null
      };
    });
    popularCache.games = { data, ts: now };
    return { data, cached: false };
  } catch (e) {
    console.warn('Popular games fetch failed', e.message || e);
    return { data: [], cached: false };
  }
}

async function fetchPopularTv() {
  const now = Date.now();
  if (popularCache.tv.data && (now - popularCache.tv.ts) < POPULAR_TTL) return { data: popularCache.tv.data, cached: true };
  try {
    const apiKey = process.env.TMDB_API_KEY; if (!apiKey) return { data: [], cached: false };
    const url = `https://api.themoviedb.org/3/trending/tv/week?api_key=${apiKey}`;
    const r = await fetch(url); if (!r.ok) return { data: [], cached: false };
    const json = await r.json();
    const imgBase = 'https://image.tmdb.org/t/p/w500';
    const data = (json.results || []).slice(0,20).map(show => {
      const poster = show.poster_path ? imgBase + show.poster_path : null;
      return { type: 'tv', media_type: 'tv', external_id: show.id, title: show.name || show.original_name || 'Untitled', cover_image_url: poster, poster_path: poster, release_year: show.first_air_date ? yearFrom(show.first_air_date) : null, overview: show.overview || null };
    });
    popularCache.tv = { data, ts: now }; return { data, cached: false };
  } catch (e) { console.warn('Popular tv fetch failed', e.message || e); return { data: [], cached: false }; }
}
async function fetchPopularBooks() {
  const now = Date.now();
  if (popularCache.books.data && (now - popularCache.books.ts) < POPULAR_TTL) return { data: popularCache.books.data, cached: true };
  try {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY; if (!apiKey) return { data: [], cached: false };
    const url = `https://www.googleapis.com/books/v1/volumes?q=subject:fiction&orderBy=newest&maxResults=20&key=${apiKey}`;
    const r = await fetch(url); if (!r.ok) return { data: [], cached: false };
    const json = await r.json();
    const data = (json.items || []).map(b => {
      const info = b.volumeInfo || {};
      let thumb = info.imageLinks && info.imageLinks.thumbnail ? info.imageLinks.thumbnail.replace('http://','https://') : null;
      return { type: 'book', media_type: 'book', external_id: b.id, title: info.title || 'Untitled', cover_image_url: thumb, poster_path: thumb, release_year: yearFrom(info.publishedDate), overview: info.description || null, author: Array.isArray(info.authors) ? info.authors[0] : null };
    });
    popularCache.books = { data, ts: now }; return { data, cached: false };
  } catch (e) { console.warn('Popular books fetch failed', e.message || e); return { data: [], cached: false }; }
}

async function searchTmdb(q, kind) {
  const apiKey = process.env.TMDB_API_KEY; if (!apiKey) throw new Error('TMDB_API_KEY not set');
  const endpoint = kind === 'tv' ? 'search/tv' : 'search/movie';
  const url = `https://api.themoviedb.org/3/${endpoint}?api_key=${apiKey}&language=en-US&query=${encodeURIComponent(q)}&page=1&include_adult=false`;
  const r = await fetch(url); if (!r.ok) throw new Error(`TMDB ${kind} search failed ${r.status}`);
  const data = await r.json();
  const imgBase = 'https://image.tmdb.org/t/p/w500';
  return (data.results || []).slice(0, 10).map(item => {
    const isTv = kind === 'tv';
    const title = isTv ? (item.name || item.original_name) : (item.title || item.original_title);
    const year = yearFrom(isTv ? item.first_air_date : item.release_date);
    const poster = item.poster_path ? imgBase + item.poster_path : null;
    return {
      type: isTv ? 'tv' : 'movie',
      media_type: isTv ? 'tv' : 'movie',
      external_id: item.id,
      title,
      poster_path: poster,
      cover_image_url: poster,
      overview: item.overview || null,
      release_year: year,
    };
  });
}

async function searchIgdb(q) {
  const clientId = process.env.TWITCH_CLIENT_ID; if (!clientId) throw new Error('TWITCH_CLIENT_ID not set');
  const token = await getIgdbToken();
  const body = `search "${q}"; fields name, first_release_date, cover.url; where category = 0; limit 10;`;
  const r = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: { 'Client-ID': clientId, 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    body
  });
  if (!r.ok) throw new Error(`IGDB search failed ${r.status}`);
  const data = await r.json();
  return data.map(g => {
    let image = g.cover && g.cover.url ? g.cover.url.replace('t_thumb', 't_cover_big') : null;
    if (image && image.startsWith('//')) image = 'https:' + image;
    return {
      type: 'game', media_type: 'game', external_id: g.id, title: g.name || 'Untitled',
      cover_image_url: image, poster_path: image, release_year: g.first_release_date ? new Date(g.first_release_date * 1000).getUTCFullYear() : null,
      overview: null,
    };
  });
}

async function searchBooks(q) {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY; if (!apiKey) throw new Error('GOOGLE_BOOKS_API_KEY not set');
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10&key=${apiKey}`;
  const r = await fetch(url); if (!r.ok) throw new Error(`Books search failed ${r.status}`);
  const data = await r.json();
  return (data.items || []).map(b => {
    const info = b.volumeInfo || {};
    let thumb = info.imageLinks && info.imageLinks.thumbnail ? info.imageLinks.thumbnail.replace('http://','https://') : null;
    return {
      type: 'book', media_type: 'book', external_id: b.id, title: info.title || 'Untitled',
      cover_image_url: thumb, poster_path: thumb, release_year: yearFrom(info.publishedDate), overview: info.description || null,
    };
  });
}

app.get('/api/search', async (req, res) => {
  const rawType = req.query.type;
  const q = (req.query.q || '').toString().trim();
  if (!q) return res.json([]);
  const type = (rawType || '').toString().toLowerCase();
  const isAggregate = !rawType || type === 'all' || type === '';
  try {
    if (isAggregate) {
      // Run all providers in parallel; tolerate individual failures.
      const safe = async (p, label) => { try { return await p; } catch (e) { console.warn('Provider failed', label, e.message || e); return []; } };
      const [movies, tv, games, books] = await Promise.all([
        safe(searchTmdb(q, 'movie'), 'tmdb-movie'),
        safe(searchTmdb(q, 'tv'), 'tmdb-tv'),
        safe(searchIgdb(q), 'igdb'),
        safe(searchBooks(q), 'books')
      ]);
      const combined = [...movies, ...tv, ...games, ...books];
      // De-duplicate by (type + external_id/id/title)
      const seen = new Set();
      const unique = [];
      for (const item of combined) {
        const key = `${item.type || item.media_type || ''}_${item.external_id || item.id || item.title}`;
        if (!seen.has(key)) { seen.add(key); unique.push(item); }
      }
      return res.json(unique);
    }

    let results = [];
    switch (type) {
      case 'movie':
      case 'movies':
        results = await searchTmdb(q, 'movie'); break;
      case 'tv':
      case 'show':
      case 'shows':
        results = await searchTmdb(q, 'tv'); break;
      case 'game':
      case 'games':
        results = await searchIgdb(q); break;
      case 'book':
      case 'books':
        results = await searchBooks(q); break;
      default:
        // Fallback: aggregate a small mix (movie + tv) if unknown type
        const [movies, tv] = await Promise.all([searchTmdb(q, 'movie'), searchTmdb(q, 'tv')]);
        results = [...movies.slice(0,5), ...tv.slice(0,5)];
    }
    return res.json(results);
  } catch (err) {
    console.error('Live search error:', err.message || err);
    return res.status(500).json({ error: 'Search failed' });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Popular movies
app.get('/popular/movies', async (req, res) => {
  try {
    const { data, cached } = await fetchPopularMovies();
    return res.json({ success: true, movies: data, cached });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Failed to fetch popular movies' });
  }
});
// API namespaced popular movies (Task 1 requirement)
app.get('/api/popular/movies', async (req, res) => {
  try {
    const { data, cached } = await fetchPopularMovies();
    return res.json({ success: true, movies: data, cached });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Failed to fetch popular movies' });
  }
});

// Popular games
app.get('/popular/games', async (req, res) => {
  try {
    const { data, cached } = await fetchPopularGames();
    return res.json({ success: true, games: data, cached });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Failed to fetch popular games' });
  }
});
// API namespaced popular games (Task 1 requirement)
app.get('/api/popular/games', async (req, res) => {
  try {
    const { data, cached } = await fetchPopularGames();
    return res.json({ success: true, games: data, cached });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Failed to fetch popular games' });
  }
});

// Popular tv
app.get('/popular/tv', async (req, res) => {
  try {
    const { data, cached } = await fetchPopularTv();
    return res.json({ success: true, tv: data, cached });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch popular tv' });
  }
});
app.get('/api/popular/tv', async (req, res) => {
  const { data, cached } = await fetchPopularTv();
  res.json({ success: true, tv: data, cached });
});

// Popular books
app.get('/popular/books', async (req, res) => {
  try {
    const { data, cached } = await fetchPopularBooks();
    return res.json({ success: true, books: data, cached });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch popular books' });
  }
});
app.get('/api/popular/books', async (req, res) => {
  const { data, cached } = await fetchPopularBooks();
  res.json({ success: true, books: data, cached });
});

// POST /api/recommend - AI powered recommendations via Gemini (LLM)
app.post('/api/recommend', async (req, res) => {
  try {
    const favorites = Array.isArray(req.body?.favorites) ? req.body.favorites : [];
    if (!favorites.length) return res.status(400).json({ error: 'favorites array required' });

    // --- 1. Normalize and bucket favorites ---
    const buckets = { games: [], films: [], books: [], tv: [] };
    const favoriteSet = new Set();
    for (const f of favorites) {
      const rawTitle = (f.title || f.name || f.key || '').toString().trim();
      if (!rawTitle) continue;
      const normTitle = rawTitle.replace(/\s+/g, ' ').trim();
      const type = (f.type || f.media_type || '').toString().toLowerCase();
      favoriteSet.add(normTitle.toLowerCase());
      if (/(game)/.test(type)) buckets.games.push(normTitle);
      else if (/(movie|film)/.test(type)) buckets.films.push(normTitle);
      else if (/book/.test(type)) buckets.books.push(normTitle);
      else if (/(tv|show|series)/.test(type)) buckets.tv.push(normTitle);
      else {
        // Heuristic classification
        if (/(edition|volume|novel|chapters?)/i.test(normTitle)) buckets.books.push(normTitle);
        else if (/(season|episode)/i.test(normTitle)) buckets.tv.push(normTitle);
        else if (/(quest|ring|souls|chronicle|tactics|battle)/i.test(normTitle)) buckets.games.push(normTitle);
        else buckets.films.push(normTitle);
      }
    }

    // --- 2. Build natural language context ---
    function phrase(list, label) {
      if (!list.length) return '';
      if (list.length === 1) return `${label} ${list[0]}`;
      return `${label} ${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
    }
    const fragments = [];
    if (buckets.books.length) fragments.push(phrase(buckets.books, 'the books'));
    if (buckets.games.length) fragments.push(phrase(buckets.games, 'the games'));
    if (buckets.films.length) fragments.push(phrase(buckets.films, 'the films'));
    if (buckets.tv.length) fragments.push(phrase(buckets.tv, 'the TV shows'));
    const humanSummary = fragments.length
      ? `Based on a user who loves ${fragments.join(', ')}.`
      : 'The user favorites list is present but could not be summarized.';

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key not configured (set GEMINI_API_KEY).', errorCode: 'NO_LLM_KEY' });
    }
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    // --- 3. Prompt Engineering ---
    // Updated schema: LLM returns ONLY minimal metadata (no image fields). Images are added server-side.
    const schemaExample = `{
  "games": [{"type":"game","title":"Title","releaseYear":2020}],
  "books": [{"type":"book","title":"Title","releaseYear":1965}],
  "films": [{"type":"movie","title":"Title","releaseYear":1999}],
  "tv": [{"type":"tv","title":"Title","releaseYear":2015}]
}`;

    const rules = [
      'Recommend EXACTLY 7 new unique items per category: games, books, films, tv (28 total).',
      'NEVER repeat or include any favorite provided.',
      'Only output real, widely released, verifiable titles (NO fabrications).',
      'OUTPUT MUST *NOT* include any image, poster, cover, URL, link, or artwork fields. Do NOT add cover_image_url, image_url, poster_path, description, id, director, author, studio, network, or any extra keys.',
      'Each item object MUST contain ONLY: type, title, releaseYear.',
      'releaseYear must be a four-digit integer if known else 0.',
      'Return ONLY strict JSON. No markdown, no backticks, no commentary.'
    ];

    const fewShotExample = `Example of REQUIRED MINIMAL JSON shape (illustrative; real answer must have 7 items in each array):\n{
  "games": [
    {"type":"game","title":"Example Game","releaseYear":2023}
  ],
  "books": [
    {"type":"book","title":"Example Book","releaseYear":2001}
  ],
  "films": [
    {"type":"movie","title":"Example Film","releaseYear":1999}
  ],
  "tv": [
    {"type":"tv","title":"Example Series","releaseYear":2015}
  ]
}`;

    const prompt = `${humanSummary}\nFavorites (lowercased for exclusion): ${Array.from(favoriteSet).join(', ')}\n\nTASK: Produce curated cross-media recommendations.\n${fewShotExample}\n\nRULES (OBEY STRICTLY):\n- ${rules.join('\n- ')}\n\nOutput Schema (EXACT SHAPE – keys required, arrays each length 7):\n${schemaExample}`;

    // --- 4. Call Gemini ---
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.65,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2200,
        responseMimeType: 'application/json'
      }
    };
    let resp;
    try {
      resp = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
    } catch (e) {
      clearTimeout(timeout);
      console.error('Gemini network error:', e);
      return res.status(502).json({ error: 'LLM network error' });
    }
    clearTimeout(timeout);
    if (!resp.ok) {
      const text = await resp.text();
      console.error('Gemini API error:', resp.status, text.slice(0,400));
      return res.status(502).json({ error: 'LLM request failed' });
    }
    const json = await resp.json();
    let raw = '';
    try { raw = json.candidates?.[0]?.content?.parts?.[0]?.text || ''; } catch (_) { raw = ''; }
    if (!raw) return res.status(500).json({ error: 'No content from LLM' });
    raw = raw.trim();
    if (raw.startsWith('```')) raw = raw.replace(/^```(json)?/i,'').replace(/```$/,'').trim();
    // --- 4b. Resilient JSON extraction / cleaning ---
    function extractJson(text) {
      const first = text.indexOf('{');
      const last = text.lastIndexOf('}');
      if (first === -1 || last === -1 || last <= first) return text; // give original (will fail later)
      return text.slice(first, last + 1);
    }
    let cleaned = extractJson(raw);
    // Remove leading BOM or stray commentary lines like "Sure, here is" etc.
    cleaned = cleaned.replace(/^[^\[{]*?(?=\{|\[)/s, '');
    // Trim code fences accidentally left
    cleaned = cleaned.replace(/```[a-zA-Z]*?/g,'').trim();
    // Attempt to strip trailing commas before } or ]
    cleaned = cleaned.replace(/,\s*(\}|\])/g, '$1');
    let parsed; let parseError = null;
    try { parsed = JSON.parse(cleaned); } catch (e1) {
      parseError = e1;
      // Fallback: try a more aggressive cleanup (remove control chars)
      const aggressive = cleaned.replace(/[\u0000-\u001F]+/g, '');
      try { parsed = JSON.parse(aggressive); parseError = null; } catch (e2) { parseError = e2; }
    }
    if (parseError) {
      console.error('Failed to parse LLM JSON after cleaning. Original len:', raw.length, 'Cleaned snippet:', cleaned.slice(0,400));
      return res.status(500).json({ error: 'Invalid JSON from LLM (parse failure)' });
    }
    // --- 4c. Normalize presence of all expected raw category keys BEFORE enrichment ---
    // We treat "films" and "movies" interchangeably internally; external contract will expose "movies".
    const out = {
      games: Array.isArray(parsed.games) ? parsed.games.slice(0,7) : [],
      books: Array.isArray(parsed.books) ? parsed.books.slice(0,7) : [],
      films: Array.isArray(parsed.films) ? parsed.films.slice(0,7) : (Array.isArray(parsed.movies) ? parsed.movies.slice(0,7) : []),
      tv: Array.isArray(parsed.tv) ? parsed.tv.slice(0,7) : []
    };
    // Explicit guarantee (defensive) – ensures downstream enrichment logic never sees undefined
    if (!Array.isArray(out.games)) out.games = [];
    if (!Array.isArray(out.books)) out.books = [];
    if (!Array.isArray(out.films)) out.films = [];
    if (!Array.isArray(out.tv)) out.tv = [];
    // Normalize minimal objects (strip any accidental extra keys other than allowed)
    function sanitize(list, typeHint) {
      return list.map(raw => ({
        type: (raw.type || typeHint || '').toString().toLowerCase(),
        title: (raw.title || '').toString().trim(),
        releaseYear: Number.isInteger(raw.releaseYear) ? raw.releaseYear : (parseInt(raw.releaseYear, 10) || 0)
      })).filter(it => it.title);
    }
    out.games = sanitize(out.games, 'game');
    out.books = sanitize(out.books, 'book');
    out.films = sanitize(out.films, 'movie');
    out.tv = sanitize(out.tv, 'tv');

    // --- 5. Image Enrichment Phase 2 (server-side) ---
    // Step 1 (above): LLM produced only minimal structured list (no images).
    // Step 2 (here): We fetch authoritative images from trusted APIs (TMDB, IGDB, Google Books) in parallel.
  // Updated: allow our placeholder host so categories with only fallback images still render
  const disallowedHosts = ['placehold.co','placehold.it','dummyimage.com'];
    const whitelistNoExtHosts = ['books.googleusercontent.com','lh3.googleusercontent.com','image.tmdb.org','images.igdb.com','media.igdb.com'];
    function hasValidImage(u) {
      if (!u) return false;
      if (/^data:/i.test(u)) return false;
      try {
        const urlObj = new URL(u);
        if (urlObj.protocol !== 'https:') return false;
        const host = urlObj.hostname.toLowerCase();
        if (disallowedHosts.some(h => host === h || host.endsWith('.'+h))) return false;
        const pathname = urlObj.pathname.toLowerCase();
        const hasExt = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(pathname);
        if (hasExt) return true;
        if (whitelistNoExtHosts.some(h => host === h || host.endsWith('.'+h))) return true;
        return false;
      } catch { return false; }
    }
  // Always fetch because LLM intentionally omitted images.
    async function fetchBestImage(title, kind) {
      try {
        const normalizedKind = /(film|movie)/.test(kind) ? 'movie' : kind;
        let results = [];
        if (normalizedKind === 'movie') results = await searchTmdb(title, 'movie');
        else if (normalizedKind === 'tv') results = await searchTmdb(title, 'tv');
        else if (normalizedKind === 'game') results = await searchIgdb(title);
        else if (normalizedKind === 'book') results = await searchBooks(title);

        const pickImageFrom = (arr) => arr.find(r => hasValidImage(ensureHttps(r.cover_image_url || r.poster_path || r.image_url)));
        let candidate = pickImageFrom(results);

        // For books, attempt a couple of alternative queries if first batch had no usable image
        if (!candidate && normalizedKind === 'book') {
          const altQueries = [`${title} book`, `${title} novel`];
          for (const qAlt of altQueries) {
            try {
              const alt = await searchBooks(qAlt);
              candidate = pickImageFrom(alt);
              if (candidate) break;
              await pause(120); // light pacing between extra Google Books calls
            } catch (e) {
              console.warn('alt book search failed', qAlt, e.message || e);
            }
          }
        }

        if (candidate) {
          const img = ensureHttps(candidate.cover_image_url || candidate.poster_path || candidate.image_url || '');
          if (hasValidImage(img)) return img;
        } else if (normalizedKind === 'book') {
          console.warn('No book cover found after attempts', title);
        }
      } catch (e) {
        console.warn('fetchBestImage failed', kind, title, e.message || e);
      }
      return null;
    }
    const pause = (ms) => new Promise(r => setTimeout(r, ms));
    async function enrichCategory(list, kind) {
      const result = [];
      for (const item of list) {
        if (!item) { result.push(item); continue; }
        const title = item.title || '';
        try {
          const cacheHit = cacheGet(kind, item.external_id || item.id, title);
          if (cacheHit && hasValidImage(cacheHit.cover_image_url || cacheHit.poster_path || cacheHit.image_url)) {
            item.cover_image_url = ensureHttps(cacheHit.cover_image_url || cacheHit.poster_path || cacheHit.image_url);
            item.poster_path = item.cover_image_url;
            result.push(item);
            await pause(100); // polite pacing even on cache hit to smooth burstiness
            continue;
          }
          const fetchedImg = await fetchBestImage(title, kind);
          if (fetchedImg) {
            item.cover_image_url = fetchedImg;
            item.poster_path = fetchedImg;
            cacheSet(kind, item.external_id || item.id, title, { ...item });
          }
          if (!hasValidImage(item.cover_image_url)) {
            const label = encodeURIComponent((kind || 'media').toUpperCase());
            item.cover_image_url = `https://via.placeholder.com/300x450.png?text=${label}`;
            item.poster_path = item.cover_image_url;
          }
          result.push(item);
        } catch (e) {
          console.warn('enrichCategory error', kind, title, e.message || e);
          const label = encodeURIComponent((kind || 'media').toUpperCase());
          item.cover_image_url = item.cover_image_url || `https://via.placeholder.com/300x450.png?text=${label}`;
          item.poster_path = item.cover_image_url;
          result.push(item);
        }
        await pause(100); // rate-limit friendly delay between external API calls
      }
      return result;
    }
    // Run categories in parallel too
    const [gamesEnriched, booksEnriched, filmsEnriched, tvEnriched] = await Promise.all([
      enrichCategory(out.games, 'game'),
      enrichCategory(out.books, 'book'),
      enrichCategory(out.films, 'movie'),
      enrichCategory(out.tv, 'tv')
    ]);
    out.games = gamesEnriched;
    out.books = booksEnriched;
    out.films = filmsEnriched;
    out.tv = tvEnriched;

    // Final pruning of any items whose images still failed validation (edge cases). We do this BEFORE building finalResponse.
    function prune(list) { return list.filter(it => it && hasValidImage(it.cover_image_url)); }
    out.games = prune(out.games);
    out.books = prune(out.books);
    out.films = prune(out.films);
    out.tv = prune(out.tv);

    // --- 5c. Guarantee presence of all four public keys expected by frontend ---
    // Frontend expects: games, movies, tv, books. We expose films internally but map to movies.
    const finalResponse = {
      games: Array.isArray(out.games) ? out.games : [],
      movies: Array.isArray(out.films) ? out.films : [], // alias films -> movies
      tv: Array.isArray(out.tv) ? out.tv : [],
      books: Array.isArray(out.books) ? out.books : []
    };

    return res.json(finalResponse);
  } catch (err) {
    console.error('Recommendation error:', err);
    return res.status(500).json({ error: 'Recommendation generation failed' });
  }
});

// Respect explicit PORT env var if provided, else default 3002 (aligns with frontend .env)
const BASE_PORT = parseInt(process.env.PORT, 10) || 3002;
function start(port) {
  const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const next = port + 1;
      console.warn(`Port ${port} in use, trying ${next}...`);
      start(next);
    } else {
      console.error('Server error:', err);
    }
  });
}
start(BASE_PORT);

// REPLACE_NORMALIZE_START
// --- Normalization (shared) ---
function ensureHttps(u) { if (!u) return u; if (u.startsWith('//')) return 'https:' + u; if (u.startsWith('http://')) return u.replace('http://','https://'); return u; }

async function fetchAndNormalizeDetails(base) {
  const title = base.title || base.name || base.key || '';
  let type = (base.type || base.media_type || '').toString().toLowerCase();
  const externalId = base.external_id || base.id || null;
  if (!type) { if (base.author) type = 'book'; else if (/season|episode/i.test(title)) type = 'tv'; else type = 'movie'; }

  const cached = cacheGet(type, externalId, title);
  if (cached) {
    return { ...cached, cover_image_url: ensureHttps(cached.cover_image_url || cached.poster_path || cached.image_url || '') };
  }
  let result = null;
  try {
    if (type === 'movie') {
      const apiKey = process.env.TMDB_API_KEY; if (externalId && apiKey) { const r = await fetch(`https://api.themoviedb.org/3/movie/${externalId}?api_key=${apiKey}`); if (r.ok) { const m = await r.json(); const imgBase = 'https://image.tmdb.org/t/p/w500'; const poster = m.poster_path ? imgBase + m.poster_path : null; result = { type: 'movie', media_type: 'movie', external_id: m.id, title: m.title || m.original_title || title, cover_image_url: poster, poster_path: poster, release_year: yearFrom(m.release_date), overview: m.overview || null, runtime: m.runtime || null }; } }
      if (!result) { const r = await searchTmdb(title, 'movie'); result = r[0] || null; }
    } else if (type === 'tv') {
      const apiKey = process.env.TMDB_API_KEY; if (externalId && apiKey) { const r = await fetch(`https://api.themoviedb.org/3/tv/${externalId}?api_key=${apiKey}`); if (r.ok) { const m = await r.json(); const imgBase = 'https://image.tmdb.org/t/p/w500'; const poster = m.poster_path ? imgBase + m.poster_path : null; result = { type: 'tv', media_type: 'tv', external_id: m.id, title: m.name || m.original_name || title, cover_image_url: poster, poster_path: poster, release_year: yearFrom(m.first_air_date), overview: m.overview || null, seasons: m.number_of_seasons || null }; } }
      if (!result) { const r = await searchTmdb(title, 'tv'); result = r[0] || null; }
    } else if (type === 'game') {
      if (externalId) { try { const clientId = process.env.TWITCH_CLIENT_ID; if (clientId) { const token = await getIgdbToken(); const q = `fields name, first_release_date, cover.url, summary; where id = ${externalId}; limit 1;`; const r = await fetch('https://api.igdb.com/v4/games', { method: 'POST', headers: { 'Client-ID': clientId, 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }, body: q }); if (r.ok) { const arr = await r.json(); if (arr[0]) { let image = arr[0].cover && arr[0].cover.url ? arr[0].cover.url.replace('t_thumb','t_cover_big') : null; if (image && image.startsWith('//')) image = 'https:' + image; result = { type: 'game', media_type: 'game', external_id: arr[0].id, title: arr[0].name || title, cover_image_url: image, poster_path: image, release_year: arr[0].first_release_date ? new Date(arr[0].first_release_date * 1000).getUTCFullYear() : null, overview: arr[0].summary || null }; } } } } catch (_) {} }
      if (!result) { const r = await searchIgdb(title); result = r[0] || null; }
    } else if (type === 'book') {
      const apiKey = process.env.GOOGLE_BOOKS_API_KEY; if (externalId && apiKey) { const r = await fetch(`https://www.googleapis.com/books/v1/volumes/${externalId}?key=${apiKey}`); if (r.ok) { const b = await r.json(); const info = b.volumeInfo || {}; let thumb = info.imageLinks && info.imageLinks.thumbnail ? info.imageLinks.thumbnail.replace('http://','https://') : null; result = { type: 'book', media_type: 'book', external_id: b.id, title: info.title || title, cover_image_url: thumb, poster_path: thumb, release_year: yearFrom(info.publishedDate), overview: info.description || null, author: Array.isArray(info.authors) ? info.authors[0] : null }; } }
      if (!result) { const r = await searchBooks(title); result = r[0] || null; }
    }
  } catch (e) { console.warn('Normalization detail fetch failed', title, type, e.message || e); }
  if (!result) return null;

  async function fillMissingImage(r) {
    if (r.cover_image_url) return r;
    try {
      if (r.type === 'game') {
        const alts = await searchIgdb(r.title || title); const alt = alts.find(a => a.cover_image_url); if (alt) r.cover_image_url = alt.cover_image_url;
      } else if (r.type === 'book') {
        const alts = await searchBooks(r.title || title); const alt = alts.find(a => a.cover_image_url); if (alt) r.cover_image_url = alt.cover_image_url;
      } else if (r.type === 'tv') {
        const alts = await searchTmdb(r.title || title, 'tv'); const alt = alts.find(a => a.cover_image_url || a.poster_path); if (alt) r.cover_image_url = alt.cover_image_url || alt.poster_path;
      } else if (r.type === 'movie') {
        const alts = await searchTmdb(r.title || title, 'movie'); const alt = alts.find(a => a.cover_image_url || a.poster_path); if (alt) r.cover_image_url = alt.cover_image_url || alt.poster_path;
      }
    } catch (e) { console.warn('Fallback image enrichment failed', r.title || title, r.type, e.message || e); }
    if (!r.cover_image_url) { const label = encodeURIComponent((r.type || 'media').toUpperCase()); r.cover_image_url = `https://via.placeholder.com/300x450.png?text=${label}`; }
    return r;
  }
  result.cover_image_url = ensureHttps(result.cover_image_url || result.poster_path || result.image_url || '');
  if (!result.cover_image_url) { await fillMissingImage(result); result.cover_image_url = ensureHttps(result.cover_image_url); }
  cacheSet(result.type || type, result.external_id || result.id, result.title || title, result);
  return result;
}

async function normalizeMediaItem(item) {
  const normalized = await fetchAndNormalizeDetails(item);
  if (!normalized) return null;
  // ensure consistent shape keys
  return {
    ...normalized,
    media_type: normalized.type,
    poster_path: normalized.cover_image_url || normalized.poster_path || null
  };
}

async function normalizeList(list, limit = 5) {
  const out = [];
  let i = 0;
  async function worker() {
    while (i < list.length) {
      const idx = i++; // take index
      const n = await normalizeMediaItem(list[idx]);
      if (n) out[idx] = n; else out[idx] = list[idx];
    }
  }
  const workers = Array.from({ length: Math.min(limit, list.length) }, () => worker());
  await Promise.all(workers);
  return out;
}

// Remove existing route (hot reload safety) then re-add using shared logic
app._router && (app._router.stack = app._router.stack.filter(l => !(l.route && l.route.path === '/api/media/normalize')));
app.post('/api/media/normalize', async (req, res) => {
  try {
    const item = req.body && (req.body.item || req.body.media || req.body);
    if (!item || typeof item !== 'object') return res.status(400).json({ error: 'item required' });
    const normalized = await normalizeMediaItem(item);
    if (!normalized) return res.status(404).json({ error: 'Unable to resolve media item' });
    return res.json({ success: true, item: normalized });
  } catch (e) { console.error('Normalize endpoint error', e); return res.status(500).json({ error: 'normalize failed' }); }
});

// Patch popular endpoints to return fully normalized objects (ensures images for games/books)
const replaceRoute = (path) => { app._router && (app._router.stack = app._router.stack.filter(l => !(l.route && l.route.path === path))); };
replaceRoute('/api/popular/movies');
app.get('/api/popular/movies', async (req, res) => { try { const { data, cached } = await fetchPopularMovies(); const normalized = await normalizeList(data); return res.json({ success: true, movies: normalized, cached, normalized: true }); } catch (e) { return res.status(500).json({ success: false, error: 'Failed to fetch popular movies' }); }});
replaceRoute('/api/popular/games');
app.get('/api/popular/games', async (req, res) => { try { const { data, cached } = await fetchPopularGames(); const normalized = await normalizeList(data); return res.json({ success: true, games: normalized, cached, normalized: true }); } catch (e) { return res.status(500).json({ success: false, error: 'Failed to fetch popular games' }); }});
replaceRoute('/api/popular/tv');
app.get('/api/popular/tv', async (req, res) => { try { const { data, cached } = await fetchPopularTv(); const normalized = await normalizeList(data); return res.json({ success: true, tv: normalized, cached, normalized: true }); } catch (e) { return res.status(500).json({ success: false, error: 'Failed to fetch popular tv' }); }});
replaceRoute('/api/popular/books');
app.get('/api/popular/books', async (req, res) => { try { const { data, cached } = await fetchPopularBooks(); const normalized = await normalizeList(data); return res.json({ success: true, books: normalized, cached, normalized: true }); } catch (e) { return res.status(500).json({ success: false, error: 'Failed to fetch popular books' }); }});
// REPLACE_NORMALIZE_END

// --- Recommendation Engine ---
// POST /api/recommend: Given a list of favorite media, return 2-3 recommendations per favorite by genre/type
app.post('/api/recommend', async (req, res) => {
  try {
    const favorites = req.body && (req.body.favorites || req.body.items || req.body);
    if (!Array.isArray(favorites) || favorites.length === 0) {
      return res.status(400).json({ error: 'No favorites provided' });
    }

    // Normalize all favorites to ensure type and title fields
    const normalizedFavorites = await normalizeList(favorites, 5);
    const recommendations = [];
    const seen = new Set();

    for (const fav of normalizedFavorites) {
      const { type, title } = fav;
      if (!type || !title) continue;

      // Search for 2-3 other media items of the same type, excluding the favorite itself
      let results = [];
      try {
        if (type === 'movie' || type === 'tv') {
          // Use TMDB search by genre/type
          results = await searchTmdb('', type); // Empty query returns trending
        } else if (type === 'game') {
          results = await fetchPopularGames().then(r => r.data || []);
        } else if (type === 'book') {
          results = await fetchPopularBooks().then(r => r.data || []);
        }
      } catch (e) { results = []; }

      // Filter out the favorite itself and already recommended items
      const filtered = (results || []).filter(item => {
        const key = `${item.type || item.media_type}_${item.external_id || item.id || item.title}`;
        const isSelf = (item.title === title);
        if (seen.has(key) || isSelf) return false;
        return true;
      });

      // Pick 2-3 recommendations per favorite
      const picks = filtered.slice(0, 3);
      for (const rec of picks) {
        const key = `${rec.type || rec.media_type}_${rec.external_id || rec.id || rec.title}`;
        seen.add(key);
        recommendations.push(rec);
      }
    }

    // Normalize recommendations for frontend display
    const normalizedRecs = await normalizeList(recommendations, 5);
    return res.json({ recommendations: normalizedRecs });
  } catch (e) {
    console.error('Recommendation error', e);
    return res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});