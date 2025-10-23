const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
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
const port = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.json());
app.use(cors({
  origin: 'https://www.tradesyndicate.in',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  credentials: true
}));
app.use(express.json());
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


// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
