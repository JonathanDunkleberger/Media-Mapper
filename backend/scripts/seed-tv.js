#!/usr/bin/env node
/**
 * Seed popular TV shows (including anime) from TMDB into the media table.
 * Usage: pnpm db:seed:tv
 */
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const db = require('../db');
const { getAlgoliaIndex } = require('./algoliaClient');

const TMDB_TV_URL = 'https://api.themoviedb.org/3/tv/popular';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

function yearFrom(dateStr) {
  if (!dateStr) return null;
  const m = dateStr.match(/\d{4}/);
  return m ? parseInt(m[0], 10) : null;
}

function transformShow(show) {
  const title = show.name || show.original_name || 'Untitled';
  const release_year = yearFrom(show.first_air_date);
  const image_url = show.poster_path ? IMAGE_BASE + show.poster_path : null;
  const overview = show.overview || null;
  const external_id = show.id;
  return { title, type: 'tv', release_year, image_url, overview, external_id };
}

async function introspectMediaColumns() {
  try {
    const res = await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='media'");
    return new Set(res.rows.map(r => r.column_name));
  } catch (e) {
    console.warn('Could not introspect media columns; assuming default schema.', e.message);
    return new Set(['title','type','release_year','image_url','external_id','overview']);
  }
}

async function insertShow(row, mediaColumns) {
  const entries = Object.entries(row).filter(([c]) => mediaColumns.has(c));
  if (!entries.length) return { rowCount: 0 };
  const cols = entries.map(([c]) => c).join(', ');
  const params = entries.map(([,v]) => v);
  const placeholders = params.map((_,i) => `$${i+1}`).join(', ');
  let conflict = '';
  if (mediaColumns.has('external_id') && mediaColumns.has('type')) {
    conflict = ' ON CONFLICT (external_id, type) DO NOTHING';
  }
  const sql = `INSERT INTO media (${cols}) VALUES (${placeholders})${conflict}`;
  return db.query(sql, params);
}

async function main() {
  console.log('--- TV Seeding Script ---');
  const { TMDB_API_KEY } = process.env;
  if (!TMDB_API_KEY) {
    console.error('TMDB_API_KEY missing in .env');
    process.exit(1);
  }
  try { await db.ready; } catch (e) { console.error('Database not ready:', e.message); process.exit(1); }

  let page = 1;
  let totalPages = 1;
  const maxPages = parseInt(process.env.TV_SEED_PAGES || '50', 10);
  const delayMs = parseInt(process.env.TV_SEED_DELAY_MS || '200', 10);
  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  console.log('Fetching popular TV shows from TMDB (paginated)...');

  let allResults = [];
  while (page <= totalPages && page <= maxPages) {
    console.log(`Fetching page ${page}/${Math.min(totalPages, maxPages)}...`);
    const url = `${TMDB_TV_URL}?api_key=${encodeURIComponent(TMDB_API_KEY)}&language=en-US&page=${page}`;
    let data;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`TMDB TV fetch failed (${res.status}): ${text}`);
      }
      data = await res.json();
    } catch (e) {
      console.error('Fetch error:', e.message); break;
    }
    totalPages = data.total_pages || totalPages;
    const results = Array.isArray(data.results) ? data.results : [];
    console.log(`Page ${page} fetched ${results.length} shows.`);
    allResults = allResults.concat(results);
    page++;
    if (page <= totalPages && page <= maxPages) await delay(delayMs);
  }
  console.log(`Fetched total ${allResults.length} TV shows across ${Math.min(page-1, maxPages)} pages.`);

  const mediaColumns = await introspectMediaColumns();
  console.log('Media table columns:', Array.from(mediaColumns).join(', '));

  const algoliaIndex = getAlgoliaIndex();

  let inserted = 0;
  for (const show of allResults) {
    const row = transformShow(show);
    try {
      const result = await insertShow(row, mediaColumns);
      if (result.rowCount > 0) {
        inserted++;
        console.log(`Inserted TV Show: ${row.title}`);
        if (algoliaIndex) {
          const objectID = row.external_id ? `${row.type}_${row.external_id}` : `tv_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
          const record = { objectID, ...row };
          algoliaIndex.partialUpdateObject(record, { createIfNotExists: true })
            .then(() => console.log(`[Algolia] Indexed TV: ${row.title}`))
            .catch(err => console.warn(`[Algolia] TV index error (${row.title}):`, err.message));
        }
      } else {
        console.log(`Skipped (exists): ${row.title}`);
      }
    } catch (e) {
      console.error(`Failed to insert TV Show ${row.title}: ${e.message}`);
    }
  }

  console.log(`TV seeding complete. Inserted: ${inserted}`);
  setTimeout(() => process.exit(), 200);
}

main();
