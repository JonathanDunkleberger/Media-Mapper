#!/usr/bin/env node
/**
 * Seed popular movies from TMDB into the media table.
 * Usage: pnpm db:seed:movies
 */

const fetch = require('node-fetch'); // v2 commonjs import
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const db = require('../db');
const { getAlgoliaIndex } = require('./algoliaClient');

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

// db.ready (exported from db.js) will resolve once connection succeeded or reject after retries.

async function ensureSchema() {
  console.log('Ensuring media table exists...');
  await db.query(`
    CREATE TABLE IF NOT EXISTS media (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      release_year INT,
      image_url TEXT,
      external_id BIGINT,
      overview TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS media_external_type_idx ON media(external_id, type);`);
  console.log('Schema ready.');
}

async function main() {
  console.log('--- Movie Seeding Script ---');
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.error('TMDB_API_KEY is not set in environment (.env)');
    process.exit(1);
  }

  // Basic media table assumption; adjust columns if actual schema differs.
  // Columns used: title, type, release_year, image_url, external_id, overview

  // Ensure DB is connected (will retry internally). This guarantees we don't fetch TMDB prematurely.
  try {
    await db.ready;
  } catch (e) {
    console.error('Failed to establish database connection:', e.message);
    process.exit(1);
  }

  // Try to ensure schema, but ignore if media table already exists with a different structure.
  try {
    await ensureSchema();
  } catch (schemaErr) {
    console.log('Skipping schema creation (table may already exist):', schemaErr.message);
  }

  // Initialize Algolia (optional)
  const algoliaIndex = getAlgoliaIndex();

  console.log('Fetching popular movies from TMDB (paginated)...');
  let page = 1;
  let totalPages = 1;
  let inserted = 0;
  const maxPages = parseInt(process.env.MOVIE_SEED_PAGES || '50', 10); // target ~50 pages (~1000 results)
  const delayMs = parseInt(process.env.MOVIE_SEED_DELAY_MS || '200', 10);
  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  // Detect existing columns of media table for dynamic insert mapping
  let mediaColumns = new Set();
  try {
    const colRes = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'media'`);
    mediaColumns = new Set(colRes.rows.map(r => r.column_name));
    console.log('Detected media columns:', Array.from(mediaColumns).join(', '));
  } catch (colErr) {
    console.warn('Could not introspect media columns; will assume newly created schema.', colErr.message);
  }

  try {
    while (page <= totalPages && page <= maxPages) {
      console.log(`Fetching page ${page}/${Math.min(totalPages, maxPages)}...`);
      const url = `${TMDB_BASE_URL}/movie/popular?api_key=${apiKey}&language=en-US&page=${page}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`TMDB request failed (status ${res.status})`);
      }
      const data = await res.json();
      totalPages = data.total_pages || 1;
      const movies = data.results || [];

      for (const m of movies) {
        const title = m.title || m.original_title || 'Untitled';
        const releaseYear = m.release_date ? parseInt(m.release_date.slice(0, 4), 10) : null;
        const imageUrl = m.poster_path ? IMAGE_BASE + m.poster_path : null;
        const overview = m.overview || null;
        const externalId = m.id; // TMDB numeric id
        const rowData = { title, type: 'movie', release_year: releaseYear, image_url: imageUrl, overview, external_id: externalId };

        // Helper to quote identifiers that contain uppercase or special chars
        const quoteIdent = (name) => (/^[a-z_][a-z0-9_]*$/.test(name) ? name : '"' + name.replace(/"/g, '""') + '"');

        // Build dynamic column/value list respecting actual existing columns (case-sensitive if quoted)
        const candidates = [
          { group: 'title', value: title, options: ['title'] },
            { group: 'type', value: 'movie', options: ['type'] },
            { group: 'year', value: releaseYear, options: ['release_year', 'releaseYear', 'year'] },
            { group: 'image', value: imageUrl, options: ['image_url', 'imageUrl', 'poster_url'] },
            { group: 'external', value: externalId, options: ['external_id', 'externalId', 'tmdb_id'] },
            { group: 'overview', value: overview, options: ['overview', 'description', 'summary'] },
        ];

        const chosen = [];
        for (const c of candidates) {
          const match = c.options.find(opt => mediaColumns.has(opt));
          if (match) {
            chosen.push({ column: match, group: c.group, value: c.value });
          }
        }

        if (!chosen.length) {
          console.warn('No matching columns found in media table for movie insert, skipping.');
          continue;
        }

        const columnsSql = chosen.map(c => quoteIdent(c.column)).join(', ');
        const values = chosen.map(c => c.value);
        const paramPlaceholders = values.map((_, i) => `$${i + 1}`).join(', ');

        let conflict = '';
        const externalCol = chosen.find(c => ['external_id','externalId','tmdb_id'].includes(c.column));
        const typeCol = chosen.find(c => c.column === 'type');
        if (externalCol && typeCol) {
          conflict = ` ON CONFLICT (${quoteIdent(externalCol.column)}, ${quoteIdent(typeCol.column)}) DO NOTHING`;
        }

        const sql = `INSERT INTO media (${columnsSql}) VALUES (${paramPlaceholders})${conflict}`;
        try {
          const result = await db.query(sql, values);
          if (result.rowCount > 0) {
            console.log(`Inserted: ${title}`);
            inserted++;
            if (algoliaIndex) {
              const objectID = rowData.external_id ? `${rowData.type}_${rowData.external_id}` : `movie_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
              const record = { objectID, ...rowData };
              algoliaIndex.partialUpdateObject(record, { createIfNotExists: true })
                .then(() => console.log(`[Algolia] Indexed movie: ${title}`))
                .catch(err => console.warn(`[Algolia] Movie index error (${title}):`, err.message));
            }
          } else {
            console.log(`Skipped (exists or no-op): ${title}`);
          }
        } catch (err) {
          console.error(`Failed to insert ${title}: ${err.message}`);
        }
      }

      console.log(`Completed page ${page}. Total items inserted so far: ${inserted}`);
      page++;
      if (page <= totalPages && page <= maxPages) {
        await delay(delayMs);
      }
    }

    try {
      const countRes = await db.query('SELECT COUNT(*) FROM media WHERE type = $1', ['movie']);
  console.log(`Seeding complete. Newly inserted: ${inserted}. Total movies in table: ${countRes.rows[0].count}`);
    } catch (countErr) {
      console.log(`Seeding complete. Newly inserted: ${inserted}. (Could not count movies: ${countErr.message})`);
    }
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exitCode = 1;
  } finally {
    // End the process explicitly (pg pool may stay open otherwise)
    setTimeout(() => process.exit(), 250);
  }
}

main();
