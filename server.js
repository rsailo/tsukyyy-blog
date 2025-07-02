const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(__dirname)); // Serves index.html, etc.

// Serve home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

const storiesPath = 'stories.json';

// Helpers
const loadStories = () => {
  return fs.existsSync(storiesPath)
    ? JSON.parse(fs.readFileSync(storiesPath, 'utf8'))
    : [];
};

const saveStories = (data) => {
  fs.writeFileSync(storiesPath, JSON.stringify(data, null, 2));
};

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
app.post('/upload', upload.single('storyImage'), (req, res) => {
  const { title, author, avatar, content } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';

  const story = {
    id: Date.now(), // number
    title,
    author,
    avatar,
    content,
    image: imageUrl,
    date: new Date().toLocaleDateString('en-GB', {
      day: '2-digit', month: 'long', year: 'numeric'
    })
  };

  const stories = loadStories();
  stories.unshift(story);
  saveStories(stories);
  res.json({ success: true, story });
});

// Get all stories
app.get('/stories', (req, res) => {
  res.json(loadStories());
});

// Get story by ID (string-safe)
app.get('/stories/:id', (req, res) => {
  const stories = loadStories();
  const story = stories.find(s => String(s.id) === req.params.id);
  story ? res.json(story) : res.status(404).send('Story not found');
});

// Update story by ID (string-safe)
app.put('/stories/:id', (req, res) => {
  const stories = loadStories();
  const index = stories.findIndex(s => String(s.id) === req.params.id);

  if (index !== -1) {
    stories[index] = {
      ...stories[index],
      ...Object.fromEntries(Object.entries(req.body).filter(([k, v]) => v !== '')),
      id: stories[index].id // preserve original ID
    };
    saveStories(stories);
    res.sendStatus(200);
  } else {
    res.status(404).send('Story not found');
  }
});

// Delete story by ID (string-safe) ✅ FIXED
app.delete('/stories/:id', (req, res) => {
  const stories = loadStories();
  const filtered = stories.filter(s => String(s.id) !== req.params.id);

  if (filtered.length !== stories.length) {
    saveStories(filtered);
    res.sendStatus(200);
  } else {
    res.status(404).send('Story not found');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🌸 Server running at http://localhost:${PORT}`);
});
