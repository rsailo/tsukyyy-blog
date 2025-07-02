const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔧 Upload directory — works for both local and Render
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');

// 🔥 Create uploads folder if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadDir)); // Serve uploaded images
app.use(express.static(__dirname)); // Serve HTML/CSS/JS

// Serve homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Story data file
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
    id: Date.now(),
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

// Get single story by ID
app.get('/stories/:id', (req, res) => {
  const stories = loadStories();
  const story = stories.find(s => String(s.id) === req.params.id);
  story ? res.json(story) : res.status(404).send('Story not found');
});

// Update story by ID
app.put('/stories/:id', (req, res) => {
  const stories = loadStories();
  const index = stories.findIndex(s => String(s.id) === req.params.id);

  if (index !== -1) {
    stories[index] = {
      ...stories[index],
      ...Object.fromEntries(Object.entries(req.body).filter(([k, v]) => v !== '')),
      id: stories[index].id
    };
    saveStories(stories);
    res.sendStatus(200);
  } else {
    res.status(404).send('Story not found');
  }
});

// Delete story by ID
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

// Start the server
app.listen(PORT, () => {
  console.log(`🌸 Server running at http://localhost:${PORT}`);
});
