#!/usr/bin/env node
/**
 * Master seeding script: runs all individual media seeders sequentially.
 * Order: movies -> games -> books -> tv
 * Usage: pnpm db:seed:all
 */
const path = require('path');
const { spawn } = require('child_process');

const scripts = [
  'seed-movies.js',
  'seed-games.js',
  'seed-books.js',
  'seed-tv.js'
];

function runScript(script) {
  return new Promise((resolve, reject) => {
    console.log(`\n=== Starting ${script} ===`);
    const proc = spawn(process.execPath, [path.join(__dirname, script)], { stdio: 'inherit' });
    proc.on('exit', (code) => {
      if (code === 0) {
        console.log(`=== Completed ${script} (code 0) ===`);
        resolve();
      } else {
        console.error(`=== ${script} failed (exit code ${code}) ===`);
        reject(new Error(`${script} failed`));
      }
    });
    proc.on('error', (err) => reject(err));
  });
}

(async () => {
  console.log('>>> Master media seeding started');
  const start = Date.now();
  for (const s of scripts) {
    try {
      await runScript(s);
    } catch (e) {
      console.error('Aborting remaining seeders due to failure:', e.message);
      process.exit(1);
    }
  }
  const secs = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n>>> All seeders completed successfully in ${secs}s.`);
})();
