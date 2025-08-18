// Configure Algolia index relevance settings for the 'media' index.
// Usage: node scripts/configure-algolia-index.js
// Requires env: ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY

require('dotenv').config();
const algoliasearch = require('algoliasearch');

async function main() {
  const { ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY } = process.env;
  if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
    console.error('Missing ALGOLIA_APP_ID or ALGOLIA_ADMIN_KEY in environment.');
    process.exit(1);
  }

  console.log('[Algolia] Initializing client...');
  const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
  const index = client.initIndex('media');

  const settings = {
    searchableAttributes: [ 'title', 'overview' ],
    customRanking: [ 'desc(release_year)' ]
  };

  try {
    await index.setSettings(settings);
    console.log('[Algolia] Index settings applied successfully to "media" index.');
    console.log(JSON.stringify(settings, null, 2));
  } catch (e) {
    console.error('[Algolia] Failed to apply settings:', e.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unexpected error configuring Algolia index:', err);
  process.exit(1);
});
