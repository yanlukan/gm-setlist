import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { execSync } from 'child_process';
import { searchYouTube } from './youtube.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Token auth for analyze endpoints (protects droplet from abuse)
app.use('/api/analyze', (req, res, next) => {
  if (process.env.API_TOKEN && req.headers['x-api-token'] !== process.env.API_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Check if Python ML models are available
let localMLAvailable = false;
try {
  execSync('python3 -c "import essentia; import allin1"', { stdio: 'ignore' });
  localMLAvailable = true;
} catch { /* ML not installed — will use Music AI API */ }

// Check if yt-dlp is available
let ytdlpAvailable = false;
try {
  execSync('which yt-dlp', { stdio: 'ignore' });
  ytdlpAvailable = true;
} catch { /* yt-dlp not installed */ }

app.post('/api/analyze/search', async (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing search query' });
  }
  try {
    const results = await searchYouTube(query);
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    localML: localMLAvailable,
    ytdlp: ytdlpAvailable,
    musicAI: !!process.env.MUSIC_AI_API_KEY,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Local ML: ${localMLAvailable ? 'available' : 'not available'}`);
  console.log(`yt-dlp: ${ytdlpAvailable ? 'available' : 'not available'}`);
});

export default app;
