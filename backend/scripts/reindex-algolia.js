// Backfill Algolia 'media' index with ALL existing rows from the database.
// This script fully replaces current index contents.
// Spec:
// 1. Connect via existing db module.
// 2. Fetch all rows: SELECT * FROM media.
// 3. Build Algolia objects with objectID pattern `${type}_${external_id}` (fallback to `${type}_${id}`).
// 4. Replace index contents using clear + saveObjects (or replaceAllObjects if desired).
// 5. Log: "Successfully re-indexed [n] records to Algolia." on success.

require('dotenv').config();
const { getAlgoliaIndex } = require('./algoliaClient');
const db = require('../db');

async function main() {
  console.log('--- Full Algolia Reindex (media) ---');
  try {
    await db.ready;
  } catch (e) {
    console.error('Database connection failed:', e.message);
    process.exit(1);
  }

  const index = getAlgoliaIndex();
  if (!index) {
    console.error('Algolia index not initialized (missing credentials).');
    process.exit(1);
  }

  let rows = [];
  try {
    const res = await db.query('SELECT * FROM media');
    rows = res.rows || [];
  } catch (e) {
    console.error('Failed to fetch media rows:', e.message);
    process.exit(1);
  }

  if (!rows.length) {
    console.log('No rows found in media table. Index will be cleared.');
    await index.clearObjects();
    console.log('Successfully re-indexed 0 records to Algolia.');
    return;
  }

  const objects = rows.map(r => {
    const objectID = (r.type && r.external_id) ? `${r.type}_${r.external_id}` : (r.type && r.id ? `${r.type}_${r.id}` : `media_${r.id}`);
    return {
      objectID,
      // Spread selected fields (avoid accidentally huge payload if table later grows columns)
      title: r.title || null,
      type: r.type || null,
      release_year: r.release_year || null,
      image_url: r.image_url || null,
      overview: r.overview || null,
      external_id: r.external_id || null,
      created_at: r.created_at || null,
    };
  });

  console.log(`Fetched ${objects.length} rows. Replacing index contents...`);

  // Clear then push full dataset (ensures removed DB rows disappear from index).
  try {
    await index.clearObjects();
  } catch (e) {
    console.warn('Warning: failed to clear index before re-populating:', e.message);
  }

  try {
    await index.saveObjects(objects, { autoGenerateObjectIDIfNotExist: false });
    console.log(`Successfully re-indexed ${objects.length} records to Algolia.`);
  } catch (e) {
    console.error('Failed to save objects to Algolia:', e.message);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Unexpected failure in reindex script:', e);
  process.exit(1);
});
