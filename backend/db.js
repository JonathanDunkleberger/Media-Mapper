const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'db.wprnhwdzujkctqmnvvpp.supabase.co',
  database: 'postgres',
  password: process.env.DATABASE_PASSWORD, // Reads the password from your .env file
  port: 5432,
});

// This part checks the connection when the server starts
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('🔴 Error connecting to the database', err.stack);
  } else {
    console.log('✅ Database connected successfully at:', res.rows[0].now);
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};