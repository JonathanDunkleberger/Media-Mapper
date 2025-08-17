// test-twitch-token-debug.js
// Run with: node test-twitch-token-debug.js

const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');

// Always load .env from backend directory, regardless of where script is run from
const envPath = path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });

const clientId = process.env.TWITCH_CLIENT_ID;
const clientSecret = process.env.TWITCH_CLIENT_SECRET;

function maskSecret(secret) {
  if (!secret) return '';
  return secret.slice(0, 3) + '...' + secret.slice(-3);
}

console.log('Loaded .env from:', envPath);
console.log('Client ID from .env:', clientId);
console.log('Client Secret from .env (masked):', maskSecret(clientSecret));

async function getTwitchToken() {
  try {
    const url = `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`;
    console.log('Request URL:', url.replace(clientSecret, maskSecret(clientSecret)));
    const response = await axios.post(url);
    console.log('Twitch token response:', response.data);
  } catch (err) {
    if (err.response) {
      console.error('Twitch token error:', err.response.data);
    } else {
      console.error('Twitch token error:', err.message);
    }
  }
}

getTwitchToken();
