require('dotenv').config();

const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// GET /api/search?q=term
app.get('/api/search', async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q) return res.json([]);
  try {
    const pattern = `%${q}%`;
    const result = await db.query('SELECT * FROM media WHERE title ILIKE $1 LIMIT 10', [pattern]);
    return res.json(result.rows);
  } catch (err) {
    console.error('Search error:', err.message || err);
    return res.status(500).json({ error: 'Search failed' });
  }
});

// POST /api/recommend - AI powered recommendations via Gemini (LLM)
app.post('/api/recommend', async (req, res) => {
  try {
    const favorites = Array.isArray(req.body?.favorites) ? req.body.favorites : [];
    if (!favorites.length) {
      return res.status(400).json({ error: 'favorites array required' });
    }

    // Extract titles & group by media type heuristically
    const groups = { games: [], movies: [], films: [], books: [], tv: [] };
    for (const item of favorites) {
      const type = (item.type || item.media_type || '').toString().toLowerCase();
      const title = item.title || item.name || item.key || '';
      if (!title) continue;
      if (type === 'game' || type === 'games') groups.games.push(title);
      else if (type === 'movie' || type === 'movies' || type === 'film' || type === 'films') groups.movies.push(title);
      else if (type === 'book' || type === 'books') groups.books.push(title);
      else if (type === 'tv' || type === 'show' || type === 'series') groups.tv.push(title);
      else {
        // Unclassified -> try to guess by simple keyword
        if (/ring|souls|quest|legend|chronicle|battle/i.test(title)) groups.games.push(title);
        else groups.movies.push(title); // fallback
      }
    }

    // Build descriptive summary
    const summaryParts = [];
    if (groups.games.length) summaryParts.push(`Games: ${groups.games.join(', ')}`);
    if (groups.movies.length) summaryParts.push(`Films: ${groups.movies.join(', ')}`);
    if (groups.books.length) summaryParts.push(`Books: ${groups.books.join(', ')}`);
    if (groups.tv.length) summaryParts.push(`TV: ${groups.tv.join(', ')}`);
    const userSummary = summaryParts.join('. ');

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key not configured (GEMINI_API_KEY).' });
    }

    const prompt = `You are an expert cross-media curator AI. A user loves the following titles.\n${userSummary}\n\nTASK: Recommend 5 new items for each category: games, books, films, tv. IMPORTANT RULES:\n1. Do NOT repeat any provided favorite.\n2. Choose critically acclaimed, thematically resonant, or stylistically similar works.\n3. Favor variety across genres & eras.\n4. Provide rich, real titles (no fabricated media).\n5. If you are unsure for a category, still give thoughtful widely-recognized picks.\n\nOUTPUT: Return ONLY valid JSON matching EXACT schema (no markdown, no commentary):\n{\n  "games": [{"type": "game", "title": "...", "id": null, "description": "...", "releaseYear": 0, "cover_image_url": "", "studio": ""}],\n  "books": [{"type": "book", "title": "...", "author": "...", "id": null, "releaseYear": 0, "cover_image_url": ""}],\n  "films": [{"type": "movie", "title": "...", "id": null, "releaseYear": 0, "cover_image_url": "", "director": ""}],\n  "tv": [{"type": "tv", "title": "...", "id": null, "releaseYear": 0, "cover_image_url": "", "network": ""}]\n}\nNotes: \n- Use null for unknown id.\n- releaseYear numeric.\n- Always return 5 objects in each array.\n- Ensure pure JSON.`;

    // Gemini generateContent API (v1beta)
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body = {
      contents: [
        { role: 'user', parts: [{ text: prompt }] }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 32,
        topP: 0.95,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json'
      }
    };

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error('Gemini API error:', resp.status, text);
      return res.status(502).json({ error: 'LLM request failed' });
    }
    const json = await resp.json();
    // Gemini response: { candidates: [ { content: { parts: [ { text: '...json...' } ] } } ] }
    let raw = '';
    try {
      raw = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (_) { raw = ''; }
    if (!raw) {
      return res.status(500).json({ error: 'No content from LLM' });
    }
    // Strip markdown fences if any
    raw = raw.trim();
    if (raw.startsWith('```')) {
      raw = raw.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse LLM JSON. Raw:', raw.slice(0,400));
      return res.status(500).json({ error: 'Invalid JSON from LLM' });
    }
    // Basic shape normalization
    const out = {
      games: Array.isArray(parsed.games) ? parsed.games : [],
      books: Array.isArray(parsed.books) ? parsed.books : [],
      films: Array.isArray(parsed.films) ? parsed.films : (Array.isArray(parsed.movies) ? parsed.movies : []),
      tv: Array.isArray(parsed.tv) ? parsed.tv : []
    };
    return res.json(out);
  } catch (err) {
    console.error('Recommendation error:', err);
    return res.status(500).json({ error: 'Recommendation generation failed' });
  }
});

const BASE_PORT = 3001;
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