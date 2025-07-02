require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Cloudinary setup
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'tsukyyy-stories',
    allowed_formats: ['jpg', 'jpeg', 'png']
  }
});
const upload = multer({ storage });

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// Mongoose schema
const storySchema = new mongoose.Schema({
  title: String,
  author: String,
  avatar: String,
  content: String,
  image: String,
  date: String
});
const Story = mongoose.model('Story', storySchema);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Serve homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Admin login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const admin = JSON.parse(fs.readFileSync('admin.json', 'utf8'));
  if (username === admin.username && password === admin.password) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// Upload story
app.post('/upload', upload.single('storyImage'), async (req, res) => {
  const { title, author, avatar, content } = req.body;
  const imageUrl = req.file ? req.file.path : '';
  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const story = new Story({ title, author, avatar, content, image: imageUrl, date });
  await story.save();
  res.json({ success: true, story });
});

// Get all stories
app.get('/stories', async (req, res) => {
  const stories = await Story.find().sort({ _id: -1 });
  res.json(stories);
});

// Get one story
app.get('/stories/:id', async (req, res) => {
  const story = await Story.findById(req.params.id);
  story ? res.json(story) : res.status(404).send('Story not found');
});

// Update story
app.put('/stories/:id', async (req, res) => {
  const update = Object.fromEntries(Object.entries(req.body).filter(([_, v]) => v !== ''));
  const story = await Story.findByIdAndUpdate(req.params.id, update, { new: true });
  story ? res.sendStatus(200) : res.status(404).send('Story not found');
});

// Delete story
app.delete('/stories/:id', async (req, res) => {
  const result = await Story.findByIdAndDelete(req.params.id);
  result ? res.sendStatus(200) : res.status(404).send('Story not found');
});

// Start server
app.listen(PORT, () => {
  console.log(`🌸 Server running at http://localhost:${PORT}`);
});
