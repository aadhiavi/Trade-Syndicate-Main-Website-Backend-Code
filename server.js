const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
// const { generateAuthUrl, getTokens } = require('./googleAuth');
const contactRoutes = require('./routes/contactRoutes');
const subscribeRoutes = require('./routes/subscribe');
const chatbotRoute = require('./routes/chatbotRoute');
const authRoutes = require('./routes/authRoutes');
const fileRoutes = require('./controllers/fileController');
const folderRoutes = require('./controllers/folderController');
const favouriteRoutes = require('./controllers/favouriteController')
const searchRoutes = require('./routes/search');
const blogcardRoutes = require('./controllers/BlogcardController');
dotenv.config();
const app = express();
const path = require('path');
const { getTokens, generateAuthUrl } = require('./googleAuth');
const port = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.json());
app.use(express.json());
const allowedOrigins = [
  'https://www.tradesyndicate.in',
  'https://tradesyndicate.in',
  'http://localhost:5173'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', contactRoutes);
app.use('/api/auth', subscribeRoutes);
app.use('/api/chatbot', chatbotRoute);
app.use('/api/trade', authRoutes);
app.use('/api/file', fileRoutes);
app.use('/api/folder', folderRoutes);
app.use('/api/starred', favouriteRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/blogcard', blogcardRoutes);


app.get('/auth', (req, res) => {
  const url = generateAuthUrl();
  res.redirect(url);
});

app.get('/oauth2callback', async (req, res) => {
  try {
    const code = req.query.code;
    const tokens = await getTokens(code);

    fs.writeFileSync('tokens.json', JSON.stringify(tokens, null, 2));
    res.send('✅ Gmail tokens saved successfully. You can close this tab.');
    console.log('✅ Gmail tokens saved:', tokens);
  } catch (err) {
    console.error('❌ Error getting tokens:', err.message);
    res.status(500).send('Error while getting Gmail tokens. Check console.');
  }
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
