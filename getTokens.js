const { google } = require('googleapis');
const readline = require('readline');
const fs = require('fs');
require('dotenv').config();

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',
});

console.log('Authorize this app by visiting this URL:\n', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page here: ', async (code) => {
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    fs.writeFileSync('tokens.json', JSON.stringify(tokens, null, 2));
    console.log('✅ Tokens saved to tokens.json');
  } catch (err) {
    console.error(err);
  }
  rl.close();
});