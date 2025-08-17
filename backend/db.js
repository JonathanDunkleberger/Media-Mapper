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

async function checkDbConnection() {
  if (!process.env.DATABASE_HOST) {
    console.warn('⚠️ DATABASE_HOST is not set; skipping initial DB connectivity check.');
    dbAvailable = false;
    return;
  }

  try {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT NOW()');
      console.log('✅ Database connected successfully at:', res.rows[0].now);
      dbAvailable = true;
    } finally {
      client.release();
    }
  } catch (err) {
    // Don't crash the process for DNS/network issues — log and continue.
    console.warn('🔴 Warning: Error connecting to the database (will continue without DB):', err.message);
    dbAvailable = false;
  }
}

// Kick off an async, non-blocking health check
checkDbConnection();

module.exports = {
  query: (text, params) => {
    if (!dbAvailable) {
      return Promise.reject(new Error('Database is not available'));
    }
    return pool.query(text, params);
  },
  isDbAvailable: () => dbAvailable,
};