// const { google } = require('googleapis');
// const fs = require('fs');
// require('dotenv').config();

// const oAuth2Client = new google.auth.OAuth2(
//     process.env.CLIENT_ID,
//     process.env.CLIENT_SECRET,
//     process.env.REDIRECT_URI
// );

// // Load saved tokens
// if (fs.existsSync('tokens.json')) {
//     const tokens = JSON.parse(fs.readFileSync('tokens.json', 'utf8'));
//     oAuth2Client.setCredentials(tokens);
// }

// // Auto-refresh tokens
// oAuth2Client.on('tokens', (newTokens) => {
//     if (newTokens.refresh_token) {
//         const tokens = JSON.parse(fs.readFileSync('tokens.json', 'utf8'));
//         tokens.refresh_token = newTokens.refresh_token;
//         fs.writeFileSync('tokens.json', JSON.stringify(tokens, null, 2));
//     }
// });

// const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

// async function sendEmail(to, subject, text) {
//     const message = [
//         `From: ${process.env.EMAIL_USER}`,
//         `To: ${to}`,
//         `Subject: ${subject}`,
//         '',
//         text,
//     ].join('\n');

//     const encodedMessage = Buffer.from(message)
//         .toString('base64')
//         .replace(/\+/g, '-')
//         .replace(/\//g, '_')
//         .replace(/=+$/, '');

//     const res = await gmail.users.messages.send({
//         userId: 'me',
//         requestBody: { raw: encodedMessage },
//     });

//     return res.data;
// }

// module.exports = { sendEmail };


const { google } = require('googleapis');
require('dotenv').config();

// Create OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
);

// Load tokens from environment variable
if (!process.env.GMAIL_TOKENS) {
    throw new Error("GMAIL_TOKENS environment variable not set");
}

const tokens = JSON.parse(process.env.GMAIL_TOKENS);
oAuth2Client.setCredentials(tokens);

// Auto-refresh token handler
oAuth2Client.on('tokens', (newTokens) => {
    if (newTokens.refresh_token) {
        console.log('⚡ Refresh token updated. Update your environment variable if needed.');
    }
});

// Gmail API instance
const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

// Function to send email
async function sendEmail(to, subject, text) {
    const message = [
        `From: ${process.env.EMAIL_USER}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        '',
        text,
    ].join('\n');

    const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    try {
        const res = await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw: encodedMessage },
        });
        return res.data;
    } catch (err) {
        console.error('Error sending email:', err);
        throw err;
    }
}

module.exports = { sendEmail };
