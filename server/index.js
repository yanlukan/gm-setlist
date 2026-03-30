import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { execSync } from 'child_process';
import multer from 'multer';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { searchYouTube, extractAudio, cleanupFile } from './youtube.js';
import { analyzeMusicAI } from './music-ai.js';
import { analyzeLocal } from './analyze.js';

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

// Simple rate limiting (for droplet — prevent abuse)
const rateLimitMap = new Map();
app.use('/api/analyze', (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxRequests = 10;

  const requests = rateLimitMap.get(ip) || [];
  const recent = requests.filter(t => now - t < windowMs);

  if (recent.length >= maxRequests) {
    return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
  }

  recent.push(now);
  rateLimitMap.set(ip, recent);
  next();
});

// Check if Python ML models are available
let localMLAvailable = false;
try {
  const venvPython = path.join(path.dirname(new URL(import.meta.url).pathname), '.venv', 'bin', 'python3');
  execSync(`${venvPython} -c "import essentia"`, { stdio: 'ignore' });
  localMLAvailable = true;
} catch { /* ML not installed — will use Music AI API */ }

// Check if yt-dlp is available
let ytdlpAvailable = false;
try {
  execSync('which yt-dlp', { stdio: 'ignore' });
  ytdlpAvailable = true;
} catch { /* yt-dlp not installed */ }

const upload = multer({
  dest: path.join(os.tmpdir(), 'gm-setlist-uploads'),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const analysisCache = new Map();

function sendSSE(res, event, data) {
  if (!res.writableEnded) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}

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

app.post('/api/analyze/url', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing URL' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  let filePath = null;
  try {
    const onProgress = (p) => sendSSE(res, 'progress', p);

    const { filePath: fp, title, artist, duration, startTime } = await extractAudio(url, onProgress);
    filePath = fp;

    let result;
    if (localMLAvailable) {
      result = await analyzeLocal(filePath, onProgress, startTime || 0);
    } else if (process.env.MUSIC_AI_API_KEY) {
      onProgress({ stage: 'cloud', message: 'Analyzing with Music AI...' });
      result = await analyzeMusicAI(filePath, onProgress);
    } else {
      throw new Error('No analysis backend available');
    }

    result.title = title;
    result.artist = artist;
    result.duration = duration;

    const jobId = crypto.randomUUID();
    analysisCache.set(jobId, { filePath, result });
    result.jobId = jobId;

    setTimeout(() => {
      const cached = analysisCache.get(jobId);
      if (cached) {
        cleanupFile(cached.filePath);
        analysisCache.delete(jobId);
      }
    }, 30 * 60 * 1000);

    sendSSE(res, 'result', result);
  } catch (err) {
    sendSSE(res, 'error', { message: err.message });
    if (filePath) cleanupFile(filePath);
  } finally {
    res.end();
  }
});

app.post('/api/analyze/upload', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const filePath = req.file.path;
  try {
    const onProgress = (p) => sendSSE(res, 'progress', p);

    let result;
    if (localMLAvailable) {
      result = await analyzeLocal(filePath, onProgress);
    } else if (process.env.MUSIC_AI_API_KEY) {
      onProgress({ stage: 'cloud', message: 'Analyzing with Music AI...' });
      result = await analyzeMusicAI(filePath, onProgress);
    } else {
      throw new Error('No analysis backend available');
    }

    result.title = req.body.title || 'Unknown';
    result.artist = req.body.artist || 'Unknown';

    const jobId = crypto.randomUUID();
    analysisCache.set(jobId, { filePath, result });
    result.jobId = jobId;

    setTimeout(() => {
      const cached = analysisCache.get(jobId);
      if (cached) {
        cleanupFile(cached.filePath);
        analysisCache.delete(jobId);
      }
    }, 30 * 60 * 1000);

    sendSSE(res, 'result', result);
  } catch (err) {
    sendSSE(res, 'error', { message: err.message });
    cleanupFile(filePath);
  } finally {
    res.end();
  }
});

app.post('/api/analyze/refine/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const cached = analysisCache.get(jobId);
  if (!cached) return res.status(404).json({ error: 'Analysis expired. Please re-analyze.' });
  if (!process.env.MUSIC_AI_API_KEY) {
    return res.status(400).json({ error: 'Music AI API key not configured' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  try {
    const onProgress = (p) => sendSSE(res, 'progress', p);
    const musicAIResult = await analyzeMusicAI(cached.filePath, onProgress);

    const localSections = cached.result.sections || [];
    const cloudSections = musicAIResult.sections || [];

    let merged;
    if (cloudSections.length === localSections.length) {
      merged = localSections.map((localSec, i) => {
        if (localSec.confidence < 75) {
          return { ...cloudSections[i], refined: true };
        }
        return localSec;
      });
    } else {
      merged = localSections.map(localSec => {
        if (localSec.confidence < 75) {
          const match = cloudSections.find(cs =>
            cs.name.toLowerCase() === localSec.name.toLowerCase()
          );
          if (match) return { ...match, refined: true };
        }
        return localSec;
      });

      const stillLow = merged.filter(s => s.confidence < 75 && !s.refined).length;
      if (stillLow > merged.length / 2) {
        merged = cloudSections;
      }
    }

    const refinedResult = {
      ...cached.result,
      sections: merged,
      source: 'merged',
      canRefine: false,
    };

    refinedResult.confidence = merged.length > 0
      ? Math.round(merged.reduce((s, sec) => s + sec.confidence, 0) / merged.length)
      : 0;

    sendSSE(res, 'result', refinedResult);
  } catch (err) {
    sendSSE(res, 'error', { message: err.message });
  } finally {
    res.end();
  }
});

// ---- Chordonomicon: search songs by name, get chord charts ----

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const chordIndexPath = path.join(__dirname, 'data', 'chordonomicon-index.json');
let chordIndex = null;

if (existsSync(chordIndexPath)) {
  try {
    chordIndex = JSON.parse(readFileSync(chordIndexPath, 'utf-8'));
    console.log(`Chordonomicon: ${Object.keys(chordIndex).length} songs loaded`);
  } catch (e) {
    console.warn('Failed to load Chordonomicon index:', e.message);
  }
}

// Spotify Client Credentials — auto-refreshing token
let spotifyToken = null;
let spotifyTokenExpiry = 0;

async function getSpotifyToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (spotifyToken && Date.now() < spotifyTokenExpiry) return spotifyToken;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) return null;
  const data = await res.json();
  spotifyToken = data.access_token;
  spotifyTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return spotifyToken;
}

app.post('/api/chords/search', async (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing search query' });
  }
  if (!chordIndex) {
    return res.status(503).json({ error: 'Chord database not available. Run: python chordonomicon.py build' });
  }

  try {
    const token = await getSpotifyToken();
    if (!token) {
      return res.status(503).json({
        error: 'Spotify credentials not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env',
      });
    }

    // Search Spotify for tracks matching the query
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!searchRes.ok) {
      return res.status(502).json({ error: 'Spotify search failed' });
    }

    const data = await searchRes.json();
    const results = [];

    for (const track of data.tracks?.items ?? []) {
      const entry = chordIndex[track.id];
      if (entry) {
        results.push({
          title: track.name,
          artist: track.artists.map(a => a.name).join(', '),
          spotifyId: track.id,
          thumbnail: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url,
          sections: entry.sections,
          genre: entry.genre,
          decade: entry.decade,
        });
      }
    }

    res.json({ results, source: 'chordonomicon' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Direct lookup by Spotify track ID
app.get('/api/chords/lookup/:spotifyId', async (req, res) => {
  if (!chordIndex) {
    return res.status(503).json({ error: 'Chord database not available' });
  }

  const entry = chordIndex[req.params.spotifyId];
  if (!entry) {
    return res.status(404).json({ error: 'Song not found in chord database' });
  }

  // Get title from oEmbed
  let title = '', thumbnail = '';
  try {
    const oembed = await spotifyOembed(req.params.spotifyId);
    title = oembed?.title ?? '';
    thumbnail = oembed?.thumbnail_url ?? '';
  } catch { /* ignore */ }

  res.json({
    title,
    spotifyId: req.params.spotifyId,
    thumbnail,
    ...entry,
  });
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
