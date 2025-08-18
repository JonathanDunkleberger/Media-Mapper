#!/usr/bin/env node
/**
 * Seed books from Google Books API into the media table.
 * Usage: pnpm db:seed:books
 */
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const db = require('../db');

const GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes';

function getYear(dateStr) {
  if (!dateStr) return null;
  const match = dateStr.match(/\d{4}/);
  return match ? parseInt(match[0], 10) : null;
}

function transformVolume(item) {
  const volumeInfo = item.volumeInfo || {};
  const title = volumeInfo.title || 'Untitled';
  const release_year = getYear(volumeInfo.publishedDate);
  let image_url = null;
  if (volumeInfo.imageLinks && volumeInfo.imageLinks.thumbnail) {
    image_url = volumeInfo.imageLinks.thumbnail.replace('http://', 'https://');
  }
  const overview = volumeInfo.description || null;
  const external_id = item.id; // Google Books volume id
  return { title, type: 'book', release_year, image_url, overview, external_id };
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

async function insertBook(row, mediaColumns) {
  const entries = Object.entries(row).filter(([c]) => mediaColumns.has(c));
  if (!entries.length) return { rowCount: 0 };
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

async function main() {
  console.log('--- Book Seeding Script ---');
  const { GOOGLE_BOOKS_API_KEY } = process.env;
  if (!GOOGLE_BOOKS_API_KEY) {
    console.error('GOOGLE_BOOKS_API_KEY missing in .env');
    process.exit(1);
  }
  try { await db.ready; } catch (e) {
    console.error('Database not ready:', e.message); process.exit(1);
  }

  const url = `${GOOGLE_BOOKS_URL}?q=bestselling+fiction&maxResults=40&key=${encodeURIComponent(GOOGLE_BOOKS_API_KEY)}`;
  let data;
  try {
    console.log('Fetching books from Google Books API...');
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google Books fetch failed (${res.status}): ${text}`);
    }
    data = await res.json();
  } catch (e) {
    console.error('Fetch error:', e.message); process.exit(1);
  }

  const items = Array.isArray(data.items) ? data.items : [];
  console.log(`Fetched ${items.length} books.`);

  const mediaColumns = await introspectMediaColumns();
  console.log('Media table columns:', Array.from(mediaColumns).join(', '));

  let inserted = 0;
  for (const item of items) {
    const row = transformVolume(item);
    try {
      const result = await insertBook(row, mediaColumns);
      if (result.rowCount > 0) {
        inserted++;
        console.log(`Inserted book: ${row.title}`);
      } else {
        console.log(`Skipped (exists): ${row.title}`);
      }
    } catch (e) {
      console.error(`Failed to insert book ${row.title}: ${e.message}`);
    }
  }

  console.log(`Book seeding complete. Inserted: ${inserted}`);
  setTimeout(() => process.exit(), 200);
}

main();
