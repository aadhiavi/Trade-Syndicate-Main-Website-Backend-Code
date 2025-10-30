// driveAuth.js
const { google } = require('googleapis');
require('dotenv').config();

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Full Drive access scope
const SCOPES = ['https://www.googleapis.com/auth/drive'];

function generateDriveAuthUrl() {
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: 'drive',
  });
}

async function getDriveTokens(code) {
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  return tokens;
}

module.exports = { generateDriveAuthUrl, getDriveTokens };
