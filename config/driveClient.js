// config/driveClient.js
const { google } = require('googleapis');
const fs = require('fs');
require('dotenv').config();

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// ✅ Load tokens from .env instead of driveTokens.json
if (process.env.DRIVE_TOKENS) {
  try {
    const tokens = JSON.parse(process.env.DRIVE_TOKENS);
    oAuth2Client.setCredentials(tokens);
  } catch (err) {
    console.error('❌ Invalid DRIVE_TOKENS format in .env:', err);
  }
} else {
  console.warn('⚠️ No DRIVE_TOKENS found in environment. Run driveAuth.js to generate them.');
}

// ✅ Optional: Auto-refresh tokens and update .env
oAuth2Client.on('tokens', (newTokens) => {
  try {
    const oldTokens = process.env.DRIVE_TOKENS ? JSON.parse(process.env.DRIVE_TOKENS) : {};
    const updatedTokens = { ...oldTokens, ...newTokens };

    const envPath = '.env';
    const envContent = fs.readFileSync(envPath, 'utf8');
    const newEnv = envContent.includes('DRIVE_TOKENS=')
      ? envContent.replace(/DRIVE_TOKENS=.*/g, `DRIVE_TOKENS=${JSON.stringify(updatedTokens)}`)
      : `${envContent}\nDRIVE_TOKENS=${JSON.stringify(updatedTokens)}`;
    fs.writeFileSync(envPath, newEnv, 'utf8');

    console.log('🔄 DRIVE_TOKENS refreshed and saved to .env');
  } catch (err) {
    console.error('❌ Failed to update DRIVE_TOKENS in .env:', err);
  }
});

const drive = google.drive({ version: 'v3', auth: oAuth2Client });

module.exports = drive;

