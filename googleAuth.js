const { google } = require('googleapis');
require('dotenv').config();

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

function generateAuthUrl() {
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state:'gmail'
  });
}

async function getTokens(code) {
  const { tokens } = await oAuth2Client.getToken(code);
  return tokens;
}

module.exports = { generateAuthUrl, getTokens };
