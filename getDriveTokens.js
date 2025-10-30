// authDrive.js
const { google } = require('googleapis');
const readline = require('readline');
const fs = require('fs');
require('dotenv').config();

// OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Drive full access
const SCOPES = ['https://www.googleapis.com/auth/drive'];

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',
  state:'drive'
});

console.log('Authorize this app by visiting this URL:\n', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page here: ', async (code) => {
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    fs.writeFileSync('driveTokens.json', JSON.stringify(tokens, null, 2));
    console.log('✅ Drive tokens saved to driveTokens.json');
  } catch (err) {
    console.error('❌ Error retrieving Drive access token:', err);
  }
  rl.close();
});
