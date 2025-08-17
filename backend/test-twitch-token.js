// test-twitch-token.js
// Run with: node test-twitch-token.js

const axios = require('axios');

const clientId = process.env.TWITCH_CLIENT_ID;
const clientSecret = process.env.TWITCH_CLIENT_SECRET;

async function getTwitchToken() {
  try {
    const url = `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`;
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
