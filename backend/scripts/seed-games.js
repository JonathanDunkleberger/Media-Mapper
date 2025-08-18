#!/usr/bin/env node
/**
 * Seed popular games from IGDB into the media table.
 * Requires env vars: TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET
 * Usage: pnpm db:seed:games
 */
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const db = require('../db');

const TWITCH_OAUTH_URL = 'https://id.twitch.tv/oauth2/token';
const IGDB_GAMES_URL = 'https://api.igdb.com/v4/games';

async function getTwitchAccessToken(clientId, clientSecret) {
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials'
  });
  const res = await fetch(TWITCH_OAUTH_URL, { method: 'POST', body: params });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to obtain Twitch token (${res.status}): ${text}`);
  }
  const json = await res.json();
  if (!json.access_token) throw new Error('No access_token in Twitch response');
  return json.access_token;
}

async function fetchGames(accessToken, clientId) {
  const query = 'fields name, first_release_date, cover.url; where total_rating_count > 200 & category = 0; sort total_rating_count desc; limit 50;';
  const res = await fetch(IGDB_GAMES_URL, {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    },
    body: query
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`IGDB games fetch failed (${res.status}): ${text}`);
  }
  return res.json();
}

function toYear(unixTs) {
  if (!unixTs) return null;
  try { return new Date(unixTs * 1000).getUTCFullYear(); } catch { return null; }
}

function transformGame(game) {
  const title = game.name || 'Untitled';
  const releaseYear = toYear(game.first_release_date);
  let imageUrl = null;
  if (game.cover && game.cover.url) {
    // IGDB image URLs often start with // - prepend https: if missing
    imageUrl = game.cover.url.replace('t_thumb', 't_cover_big');
    if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
  }
  return {
    title,
    type: 'game',
    release_year: releaseYear,
    image_url: imageUrl,
    external_id: game.id,
    overview: null,
  };
}

async function insertGame(row, mediaColumns) {
  // Build insert only for columns that exist in the media table
  const entries = Object.entries(row).filter(([col]) => mediaColumns.has(col));
  const cols = entries.map(([c]) => c).join(', ');
  const params = entries.map(([_, v]) => v);
  const placeholders = params.map((_, i) => `$${i + 1}`).join(', ');
  let conflict = '';
  if (mediaColumns.has('external_id') && mediaColumns.has('type')) {
    conflict = ' ON CONFLICT (external_id, type) DO NOTHING';
  }
  const sql = `INSERT INTO media (${cols}) VALUES (${placeholders})${conflict}`;
  return db.query(sql, params);
}

async function introspectMediaColumns() {
  try {
    const res = await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='media'");
    return new Set(res.rows.map(r => r.column_name));
  } catch (e) {
    console.warn('Could not introspect media columns, assuming default schema.', e.message);
    return new Set(['title','type','release_year','image_url','external_id','overview']);
  }
}

async function main() {
  console.log('--- Game Seeding Script (IGDB) ---');
  const { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } = process.env;
  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
    console.error('TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET missing in .env');
    process.exit(1);
  }
  try {
    // Ensure DB is ready
    await db.ready;
  } catch (e) {
    console.error('Database not ready:', e.message);
    process.exit(1);
  }

  let token;
  try {
    console.log('Requesting Twitch access token...');
    token = await getTwitchAccessToken(TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET);
    console.log('Obtained Twitch token.');
  } catch (e) {
    console.error('Auth failure:', e.message);
    process.exit(1);
  }

  let games;
  try {
    console.log('Fetching games from IGDB...');
    games = await fetchGames(token, TWITCH_CLIENT_ID);
    console.log(`Fetched ${games.length} games.`);
  } catch (e) {
    console.error('IGDB fetch error:', e.message);
    process.exit(1);
  }

  const mediaColumns = await introspectMediaColumns();
  console.log('Media table columns:', Array.from(mediaColumns).join(', '));

  let inserted = 0;
  for (const g of games) {
    const row = transformGame(g);
    try {
      const result = await insertGame(row, mediaColumns);
      if (result.rowCount > 0) {
        inserted++;
        console.log(`Inserted game: ${row.title}`);
      } else {
        console.log(`Skipped (exists): ${row.title}`);
      }
    } catch (e) {
      console.error(`Failed to insert game ${row.title}: ${e.message}`);
    }
  }

  console.log(`Game seeding complete. Inserted: ${inserted}`);
  setTimeout(() => process.exit(), 200);
}

main();
