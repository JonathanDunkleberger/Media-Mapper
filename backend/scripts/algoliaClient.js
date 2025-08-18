// Shared Algolia index initializer for seeding scripts.
// Returns the 'media' index or null if env vars are missing or init fails.
const algoliasearch = require('algoliasearch');

let initialized = false;
let index = null;

function getAlgoliaIndex() {
  if (initialized) return index; // may be null
  initialized = true;
  const { ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY } = process.env;
  if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
    console.warn('[Algolia] ALGOLIA_APP_ID or ALGOLIA_ADMIN_KEY missing – skipping indexing.');
    return index = null;
  }
  try {
    const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
    index = client.initIndex('media');
    console.log('[Algolia] Initialized index "media"');
  } catch (e) {
    console.warn('[Algolia] Failed to initialize:', e.message);
    index = null;
  }
  return index;
}

module.exports = { getAlgoliaIndex };
