import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { execSync } from 'child_process';
import multer from 'multer';
import path from 'path';
import os from 'os';
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
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
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

    const { filePath: fp, title, artist, duration } = await extractAudio(url, onProgress);
    filePath = fp;

    let result;
    if (localMLAvailable) {
      result = await analyzeLocal(filePath, onProgress);
    } else if (process.env.MUSIC_AI_API_KEY) {
      onProgress({ stage: 'cloud', message: 'Analyzing with Music AI...' });
      result = await analyzeMusicAI(filePath, onProgress);
    } else {
      throw new Error('No analysis backend available');
    }

    result.title = title;
    result.artist = artist;
    result.duration = duration;

    const jobId = Date.now().toString(36);
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

    const jobId = Date.now().toString(36);
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

    refinedResult.confidence = Math.round(
      merged.reduce((s, sec) => s + sec.confidence, 0) / merged.length
    );

    sendSSE(res, 'result', refinedResult);
  } catch (err) {
    sendSSE(res, 'error', { message: err.message });
  } finally {
    res.end();
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
