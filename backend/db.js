// backend/db.js
const { Pool } = require('pg');

const poolConfig = {
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  user: process.env.DATABASE_USER,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
};

// Only attach ssl options when a host is provided (e.g., Supabase)
if (process.env.DATABASE_HOST) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

let dbAvailable = false;

async function attemptDbConnection(maxRetries = 30, delayMs = 1000) {
  if (!process.env.DATABASE_HOST) {
    console.warn('⚠️ DATABASE_HOST is not set; database features disabled.');
    return false;
  }
  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = await pool.connect();
      try {
        const res = await client.query('SELECT NOW()');
        console.log('✅ Database connected successfully at:', res.rows[0].now);
        dbAvailable = true;
        return true;
      } finally {
        client.release();
      }
    } catch (err) {
      const attempt = i + 1;
      console.warn(`🔴 DB connection attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (attempt === maxRetries) break;
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return false;
}

// Expose a promise that resolves when the database is connected (or rejects if it ultimately fails)
const ready = (async () => {
  const success = await attemptDbConnection();
  if (!success) throw new Error('Database connection failed after retries');
  return true;
})();

module.exports = {
  query: (text, params) => {
    if (!dbAvailable) {
      return Promise.reject(new Error('Database is not available'));
    }
    return pool.query(text, params);
  },
  isDbAvailable: () => dbAvailable,
  ready,
};