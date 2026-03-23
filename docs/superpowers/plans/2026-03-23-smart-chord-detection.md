# Smart Chord Detection System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hybrid chord detection system that auto-detects chords, key, tempo, and sections from YouTube URLs, search, or audio file upload — local ML first, Music AI API as paid refinement.

**Architecture:** Node.js Express server handles API + YouTube extraction, spawns a Python subprocess for local ML (Essentia chord/key/tempo + allin1 sections). PWA gets a new import modal with SSE progress. Server runs locally on MacBook (primary) with DigitalOcean droplet as API-only fallback.

**Tech Stack:** Node.js 20+, Express, yt-dlp, Python 3.11+, Essentia, allin1, Music AI REST API, vanilla JS PWA, SSE (EventSource)

**Spec:** `docs/superpowers/specs/2026-03-23-smart-chord-detection-design.md`

---

## File Structure

```
cheetsheetForGuitarPlaying/
├── index.html                    # MODIFY — add import modal UI + SSE client + server fallback + song persistence
├── songs.js                      # NO CHANGE — default songs, loaded on first visit only
├── server/
│   ├── package.json              # CREATE — Node.js deps (express, multer, cors, dotenv)
│   ├── .gitignore                # CREATE — ignore node_modules, .venv, .env
│   ├── index.js                  # CREATE — Express server, routes, SSE, orchestration, token auth
│   ├── youtube.js                # CREATE — yt-dlp wrapper + YouTube search
│   ├── music-ai.js               # CREATE — Music AI API client (skeleton — adapt after API key obtained)
│   ├── analyze.js                # CREATE — orchestrates local ML + result formatting
│   └── analyze.py                # CREATE — Python script: Essentia + allin1, outputs JSON to stdout
├── server/.env.example           # CREATE — template for MUSIC_AI_API_KEY, API_TOKEN
└── docs/superpowers/specs/...    # EXISTS — design spec
```

**Key decisions:**
- Server is a separate directory with its own `package.json` — keeps PWA simple
- Single `analyze.py` script handles all ML — Essentia for chords/key/tempo, allin1 for sections
- `index.js` is the only entry point — all routes in one file (small server, no need for router modules)
- PWA additions go directly into existing `index.html` — no new frontend files
- **Song persistence:** Imported songs stored in localStorage (`cheatsheet-songs-custom`). On load, merge default `SONGS` from `songs.js` with custom songs from localStorage. This means imported songs survive page reloads without needing server-side file writes.
- **Music AI API:** `music-ai.js` is a skeleton. The workflow ID and response format MUST be adapted after obtaining an API key and consulting the real API docs at `https://music.ai/docs/api/reference/`. Mark all Music AI response parsing as provisional.

---

### Task 1: Server Scaffold + Health Endpoint

**Files:**
- Create: `server/package.json`
- Create: `server/.gitignore`
- Create: `server/index.js`
- Create: `server/.env.example`

- [ ] **Step 1: Create .gitignore**

```
node_modules/
.venv/
.env
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "gm-setlist-server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "multer": "^1.4.5-lts.1"
  }
}
```

- [ ] **Step 3: Create .env.example**

```
MUSIC_AI_API_KEY=
API_TOKEN=changeme
PORT=3000
```

- [ ] **Step 4: Create index.js with health endpoint + token auth**

```javascript
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { execSync } from 'child_process';

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
```

- [ ] **Step 5: Install dependencies and test**

```bash
cd server && npm install
```

- [ ] **Step 6: Run server and verify health endpoint**

```bash
cd server && node index.js &
curl http://localhost:3000/api/health
# Expected: {"status":"ok","localML":false,"ytdlp":true/false,"musicAI":false}
kill %1
```

- [ ] **Step 7: Commit**

```bash
git add server/.gitignore server/package.json server/index.js server/.env.example
git commit -m "feat(server): scaffold Express server with health endpoint and token auth"
```

---

### Task 2: YouTube Extraction Module

**Files:**
- Create: `server/youtube.js`
- Modify: `server/index.js`

- [ ] **Step 1: Install yt-dlp if not present**

```bash
brew install yt-dlp
# Verify:
yt-dlp --version
```

- [ ] **Step 2: Create youtube.js**

```javascript
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import fs from 'fs';

const execAsync = promisify(exec);
const TMP_DIR = path.join(os.tmpdir(), 'gm-setlist');

// Ensure temp directory exists
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

/**
 * Extract audio from YouTube URL. Returns path to downloaded audio file.
 * @param {string} url - YouTube URL
 * @param {function} onProgress - callback for progress updates
 * @returns {Promise<{filePath: string, title: string, artist: string, duration: number}>}
 */
export async function extractAudio(url, onProgress) {
  // Validate URL
  const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)/;
  if (!ytRegex.test(url)) {
    throw new Error('Invalid YouTube URL');
  }

  onProgress?.({ stage: 'downloading', message: 'Downloading audio...' });

  const outputPath = path.join(TMP_DIR, `${Date.now()}`);

  try {
    // Get metadata first
    const { stdout: metaJson } = await execAsync(
      `yt-dlp --dump-json --no-download "${url}"`,
      { timeout: 30000 }
    );
    const meta = JSON.parse(metaJson);

    if (meta.duration > 600) {
      throw new Error('Video exceeds 10-minute limit');
    }

    // Download audio only as wav (best for ML analysis)
    await execAsync(
      `yt-dlp -x --audio-format wav --audio-quality 0 -o "${outputPath}.%(ext)s" "${url}"`,
      { timeout: 120000 }
    );

    const filePath = `${outputPath}.wav`;
    if (!fs.existsSync(filePath)) {
      throw new Error('Download failed — audio file not created');
    }

    return {
      filePath,
      title: meta.title || 'Unknown',
      artist: meta.artist || meta.uploader || 'Unknown',
      duration: meta.duration || 0,
    };
  } catch (err) {
    // Clean up on failure
    const possibleFiles = [`${outputPath}.wav`, `${outputPath}.webm`, `${outputPath}.m4a`];
    possibleFiles.forEach(f => { try { fs.unlinkSync(f); } catch {} });

    if (err.message.includes('Video unavailable') || err.message.includes('Private video')) {
      throw new Error('Video unavailable or region-restricted. Try uploading the audio file directly.');
    }
    if (err.message.includes('429') || err.message.includes('Too Many Requests')) {
      throw new Error('YouTube download temporarily blocked. Try again in a few minutes or upload the file.');
    }
    throw err;
  }
}

/**
 * Search YouTube for a song. Returns top results.
 * @param {string} query - search query (e.g., "Faith George Michael")
 * @returns {Promise<Array<{id: string, title: string, duration: string, thumbnail: string}>>}
 */
export async function searchYouTube(query, maxResults = 5) {
  try {
    const { stdout } = await execAsync(
      `yt-dlp --flat-playlist --dump-json "ytsearch${maxResults}:${query.replace(/"/g, '\\"')}"`,
      { timeout: 15000 }
    );

    return stdout.trim().split('\n').filter(Boolean).map(line => {
      const item = JSON.parse(line);
      return {
        id: item.id,
        url: `https://www.youtube.com/watch?v=${item.id}`,
        title: item.title,
        duration: item.duration ? formatDuration(item.duration) : '?',
        durationSec: item.duration || 0,
        thumbnail: item.thumbnails?.[0]?.url || '',
      };
    });
  } catch (err) {
    throw new Error('YouTube search failed. Try again.');
  }
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Clean up a temp audio file after analysis.
 */
export function cleanupFile(filePath) {
  try { fs.unlinkSync(filePath); } catch {}
}
```

- [ ] **Step 3: Add search endpoint to index.js**

Add after the health endpoint in `server/index.js`:

```javascript
import { searchYouTube } from './youtube.js';

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
```

- [ ] **Step 4: Test YouTube search**

```bash
cd server && node -e "
import { searchYouTube } from './youtube.js';
const r = await searchYouTube('Faith George Michael');
console.log(JSON.stringify(r, null, 2));
"
# Expected: array of 5 YouTube results with id, title, duration, thumbnail
```

- [ ] **Step 5: Test audio extraction**

```bash
cd server && node -e "
import { extractAudio, cleanupFile } from './youtube.js';
const r = await extractAudio('https://www.youtube.com/watch?v=lu3VTngm1F0', console.log);
console.log('File:', r.filePath, 'Title:', r.title);
cleanupFile(r.filePath);
"
# Expected: downloads audio, prints file path, then cleans up
```

- [ ] **Step 6: Commit**

```bash
git add server/youtube.js server/index.js
git commit -m "feat(server): add YouTube search and audio extraction via yt-dlp"
```

---

### Task 3: Python Analysis Script (Essentia + allin1)

**Files:**
- Create: `server/analyze.py`
- Create: `server/requirements.txt`

- [ ] **Step 1: Create requirements.txt**

```
essentia
allin1
```

- [ ] **Step 2: Set up Python virtual environment and install**

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install essentia allin1
```

Note: Using `essentia` (non-TF) which has native Apple Silicon support. The `ChordsDetection` algorithm works without TensorFlow. If you need TF-based models later, upgrade to `essentia-tensorflow`.

- [ ] **Step 3: Create analyze.py**

```python
#!/usr/bin/env python3
"""
Audio analysis script. Accepts an audio file path, outputs JSON to stdout.
Uses Essentia for chords/key/tempo and allin1 for section segmentation.
"""
import sys
import json
import warnings
warnings.filterwarnings('ignore')

def analyze(file_path):
    import essentia.standard as es
    import numpy as np

    # Load audio
    loader = es.MonoLoader(filename=file_path, sampleRate=44100)
    audio = loader()

    results = {}

    # --- Key detection ---
    key_extractor = es.KeyExtractor()
    key, scale, key_confidence = key_extractor(audio)
    results['key'] = key + ('m' if scale == 'minor' else '')
    results['keyConfidence'] = round(float(key_confidence), 3)

    # --- BPM / tempo ---
    rhythm_extractor = es.RhythmExtractor2013(method='multifeature')
    bpm, beats, beats_confidence, _, beats_intervals = rhythm_extractor(audio)
    results['bpm'] = round(float(bpm))
    results['beats'] = [round(float(b), 3) for b in beats]

    # --- Time signature estimation ---
    # Simple heuristic: check beat grouping
    if len(beats_intervals) > 4:
        median_interval = float(np.median(beats_intervals))
        # 6/8 typically has shorter intervals grouped in 3
        results['timeSignature'] = '4/4'  # default, good enough for most pop/rock
    else:
        results['timeSignature'] = '4/4'

    # --- Chord detection ---
    frame_size = 8192
    hop_size = 4096
    sr = 44100

    # Use ChordsDetection algorithm
    w = es.Windowing(type='blackmanharris62')
    spectrum = es.Spectrum()
    spectral_peaks = es.SpectralPeaks(
        sampleRate=sr, magnitudeThreshold=0.00001,
        minFrequency=20, maxFrequency=3500, maxPeaks=60
    )
    hpcp = es.HPCP(
        size=36, referenceFrequency=440,
        harmonics=8, bandPreset=True,
        minFrequency=20, maxFrequency=3500,
        sampleRate=sr
    )
    chords_detection = es.ChordsDetection(hopSize=hop_size, sampleRate=sr)

    # Compute HPCP frames
    hpcp_frames = []
    for frame in es.FrameGenerator(audio, frameSize=frame_size, hopSize=hop_size):
        windowed = w(frame)
        spec = spectrum(windowed)
        freqs, mags = spectral_peaks(spec)
        h = hpcp(freqs, mags)
        hpcp_frames.append(h)

    if hpcp_frames:
        hpcp_array = np.array(hpcp_frames)
        chords, strengths = chords_detection(hpcp_array)

        # Build chord timeline with confidence
        chord_timeline = []
        current_chord = None
        current_start = 0
        current_strengths = []

        for i, (chord, strength) in enumerate(zip(chords, strengths)):
            time = i * hop_size / sr
            if chord != current_chord:
                if current_chord and current_chord != 'N':
                    chord_timeline.append({
                        'chord': current_chord,
                        'time': round(current_start, 3),
                        'duration': round(time - current_start, 3),
                        'confidence': round(float(np.mean(current_strengths)), 3)
                    })
                current_chord = chord
                current_start = time
                current_strengths = [float(strength)]
            else:
                current_strengths.append(float(strength))

        # Final chord
        if current_chord and current_chord != 'N':
            end_time = len(audio) / sr
            chord_timeline.append({
                'chord': current_chord,
                'time': round(current_start, 3),
                'duration': round(end_time - current_start, 3),
                'confidence': round(float(np.mean(current_strengths)), 3)
            })

        results['chords'] = chord_timeline
    else:
        results['chords'] = []

    # --- Section detection via allin1 ---
    try:
        import allin1
        analysis = allin1.analyze(file_path)
        sections = []
        label_map = {
            'verse': 'Verse', 'chorus': 'Chorus', 'bridge': 'Bridge',
            'pre-chorus': 'Pre-Chorus', 'intro': 'Intro', 'outro': 'Outro',
            'inst': 'Instrumental', 'solo': 'Solo', 'break': 'Break',
        }
        for segment in analysis.segments:
            label = segment.label.lower().strip()
            name = label_map.get(label, label.title() if label else 'Section')
            sections.append({
                'name': name,
                'start': round(float(segment.start), 3),
                'end': round(float(segment.end), 3),
            })
        results['sections'] = sections
    except Exception as e:
        # Fallback: single section for whole song
        results['sections'] = [{
            'name': 'Full Song',
            'start': 0,
            'end': round(len(audio) / sr, 3),
        }]
        results['sectionError'] = str(e)

    return results

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(json.dumps({'error': 'Usage: analyze.py <audio_file_path>'}))
        sys.exit(1)

    try:
        result = analyze(sys.argv[1])
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)
```

- [ ] **Step 4: Test the Python script with a sample audio file**

First download a short test clip:
```bash
cd server && source .venv/bin/activate
yt-dlp -x --audio-format wav -o "/tmp/test-song.%(ext)s" "https://www.youtube.com/watch?v=lu3VTngm1F0" --max-filesize 10M
python3 analyze.py /tmp/test-song.wav
# Expected: JSON with key, bpm, timeSignature, chords array, sections array
rm /tmp/test-song.wav
```

- [ ] **Step 5: Commit**

```bash
git add server/analyze.py server/requirements.txt
git commit -m "feat(server): add Python analysis script with Essentia + allin1"
```

---

### Task 4: Analysis Orchestrator (Node ↔ Python)

**Files:**
- Create: `server/analyze.js`
- Modify: `server/index.js`

- [ ] **Step 1: Create analyze.js**

```javascript
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PYTHON = path.join(__dirname, '.venv', 'bin', 'python3');
const SCRIPT = path.join(__dirname, 'analyze.py');

/**
 * Run local ML analysis on an audio file.
 * @param {string} filePath - path to audio file (wav)
 * @param {function} onProgress - callback for progress updates
 * @returns {Promise<object>} analysis results
 */
export function analyzeLocal(filePath, onProgress) {
  return new Promise((resolve, reject) => {
    onProgress?.({ stage: 'analyzing', message: 'Analyzing audio (chords, key, tempo, sections)...' });

    const proc = spawn(PYTHON, [SCRIPT, filePath], {
      timeout: 300000, // 5 min max
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Analysis failed: ${stderr || 'unknown error'}`));
      }
      try {
        const result = JSON.parse(stdout);
        if (result.error) return reject(new Error(result.error));

        onProgress?.({ stage: 'formatting', message: 'Formatting results...' });

        // Merge chords into sections
        const formatted = formatResults(result);
        resolve(formatted);
      } catch (err) {
        reject(new Error('Failed to parse analysis results'));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to start analysis: ${err.message}`));
    });
  });
}

/**
 * Merge chord timeline with section boundaries to produce the app's song format.
 */
function formatResults(raw) {
  const { key, keyConfidence, bpm, timeSignature, chords, sections } = raw;

  // For each section, collect the chords that fall within its time range
  const formattedSections = sections.map(section => {
    const sectionChords = chords.filter(c =>
      c.time >= section.start && c.time < section.end
    );

    // Deduplicate consecutive same chords
    const deduped = [];
    for (const c of sectionChords) {
      if (deduped.length === 0 || deduped[deduped.length - 1].chord !== c.chord) {
        deduped.push(c);
      }
    }

    const avgConfidence = deduped.length > 0
      ? deduped.reduce((sum, c) => sum + c.confidence, 0) / deduped.length
      : 0;

    return {
      name: section.name,
      chords: deduped.map(c => c.chord).join('  '),
      chordsDetail: deduped.map(c => ({
        chord: c.chord,
        confidence: c.confidence,
      })),
      confidence: Math.round(avgConfidence * 100),
    };
  });

  const overallConfidence = formattedSections.length > 0
    ? Math.round(formattedSections.reduce((s, sec) => s + sec.confidence, 0) / formattedSections.length)
    : 0;

  return {
    source: 'local',
    key,
    keyConfidence: Math.round(keyConfidence * 100),
    bpm,
    timeSignature,
    sections: formattedSections,
    confidence: overallConfidence,
    canRefine: true,
  };
}
```

- [ ] **Step 2: Add analyze URL endpoint with SSE to index.js**

Add to `server/index.js`:

```javascript
import multer from 'multer';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { extractAudio, searchYouTube, cleanupFile } from './youtube.js';
import { analyzeLocal } from './analyze.js';

const upload = multer({
  dest: path.join(os.tmpdir(), 'gm-setlist-uploads'),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// Store analysis results temporarily for refinement
const analysisCache = new Map();

// SSE helper
function sendSSE(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

app.post('/api/analyze/url', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing URL' });

  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  let filePath = null;
  try {
    const onProgress = (p) => sendSSE(res, 'progress', p);

    // Extract audio
    const { filePath: fp, title, artist } = await extractAudio(url, onProgress);
    filePath = fp;

    // Analyze
    let result;
    if (localMLAvailable) {
      result = await analyzeLocal(filePath, onProgress);
    } else if (process.env.MUSIC_AI_API_KEY) {
      onProgress({ stage: 'cloud', message: 'Analyzing with Music AI...' });
      // TODO: implement Music AI fallback (Task 5)
      result = { error: 'Music AI not yet implemented' };
    } else {
      throw new Error('No analysis backend available');
    }

    // Add metadata from YouTube
    result.title = title;
    result.artist = artist;

    // Cache for potential refinement
    const jobId = Date.now().toString(36);
    analysisCache.set(jobId, { filePath, result });
    result.jobId = jobId;

    // Auto-cleanup cache after 30 minutes
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
      result = { error: 'Music AI not yet implemented' };
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
```

- [ ] **Step 3: Test the full local pipeline**

```bash
cd server && node index.js &
# Test URL analysis (will only work if Python ML is installed):
curl -X POST http://localhost:3000/api/analyze/url \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=lu3VTngm1F0"}'
# Expected: SSE stream with progress events then result event
kill %1
```

- [ ] **Step 4: Commit**

```bash
git add server/analyze.js server/index.js
git commit -m "feat(server): add analysis orchestrator with SSE progress streaming"
```

---

### Task 5: Music AI API Client

**Files:**
- Create: `server/music-ai.js`
- Modify: `server/index.js`

- [ ] **Step 1: Create music-ai.js**

```javascript
/**
 * Music AI (Moises) API client — SKELETON.
 * The workflow ID, request format, and response schema below are provisional.
 * MUST be adapted after obtaining an API key and testing against the real API.
 * Docs: https://music.ai/docs/api/reference/
 */

const BASE_URL = 'https://api.music.ai/v1';

/**
 * Analyze audio file via Music AI API.
 * @param {string} filePath - local path to audio file
 * @param {function} onProgress - progress callback
 * @returns {Promise<object>} formatted analysis result
 */
export async function analyzeMusicAI(filePath, onProgress) {
  const apiKey = process.env.MUSIC_AI_API_KEY;
  if (!apiKey) throw new Error('Music AI API key not configured');

  const headers = { 'Authorization': apiKey, 'Content-Type': 'application/json' };

  onProgress?.({ stage: 'uploading', message: 'Uploading to Music AI...' });

  // Step 1: Get upload URL
  const uploadRes = await fetch(`${BASE_URL}/upload`, { headers });
  if (!uploadRes.ok) throw new Error('Failed to get upload URL');
  const { uploadUrl, downloadUrl } = await uploadRes.json();

  // Step 2: Upload file
  const fs = await import('fs');
  const fileBuffer = fs.readFileSync(filePath);
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: fileBuffer,
    headers: { 'Content-Type': 'audio/wav' },
  });
  if (!putRes.ok) throw new Error('Failed to upload audio file');

  onProgress?.({ stage: 'analyzing', message: 'Music AI analyzing...' });

  // Step 3: Create analysis job
  const jobRes = await fetch(`${BASE_URL}/job`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'gm-setlist-analysis',
      workflow: 'music-ai/chord-detection',
      params: { inputUrl: downloadUrl },
    }),
  });
  if (!jobRes.ok) throw new Error('Failed to create analysis job');
  const job = await jobRes.json();

  // Step 4: Poll for completion
  const jobId = job.id;
  let status = 'QUEUED';
  while (status !== 'SUCCEEDED' && status !== 'FAILED') {
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await fetch(`${BASE_URL}/job/${jobId}`, { headers });
    if (!statusRes.ok) throw new Error('Failed to check job status');
    const statusData = await statusRes.json();
    status = statusData.status;

    if (status === 'FAILED') {
      throw new Error('Music AI analysis failed: ' + (statusData.error || 'unknown'));
    }

    if (status === 'SUCCEEDED') {
      return formatMusicAIResult(statusData);
    }
  }
}

/**
 * Format Music AI API response into our app's format.
 */
function formatMusicAIResult(jobData) {
  // Music AI returns structured chord/section data
  // Exact format depends on the workflow — this is a best-effort mapping
  const result = {
    source: 'music-ai',
    confidence: 95,
    canRefine: false,
    key: jobData.result?.key || 'C',
    bpm: jobData.result?.bpm || 120,
    timeSignature: jobData.result?.timeSignature || '4/4',
    sections: [],
  };

  // Map Music AI sections + chords to our format
  if (jobData.result?.sections) {
    result.sections = jobData.result.sections.map(s => ({
      name: normalizeSectionName(s.label || s.name || 'Section'),
      chords: (s.chords || []).join('  '),
      confidence: 95,
    }));
  } else if (jobData.result?.chords) {
    // No sections — put all chords in one section
    result.sections = [{
      name: 'Full Song',
      chords: jobData.result.chords.map(c => c.label || c.chord).join('  '),
      confidence: 95,
    }];
  }

  return result;
}

const SECTION_LABEL_MAP = {
  'verse': 'Verse', 'chorus': 'Chorus', 'bridge': 'Bridge',
  'pre-chorus': 'Pre-Chorus', 'intro': 'Intro', 'outro': 'Outro',
  'inst': 'Instrumental', 'solo': 'Solo', 'break': 'Break',
};

function normalizeSectionName(label) {
  return SECTION_LABEL_MAP[label.toLowerCase().trim()] || label.charAt(0).toUpperCase() + label.slice(1);
}
```

- [ ] **Step 2: Wire Music AI into index.js**

Add import at top of `server/index.js`:
```javascript
import { analyzeMusicAI } from './music-ai.js';
```

Replace the `// TODO: implement Music AI fallback` blocks in both `/api/analyze/url` and `/api/analyze/upload` handlers with:
```javascript
result = await analyzeMusicAI(filePath, onProgress);
```

Add the refinement endpoint:
```javascript
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

    // Merge: replace low-confidence sections with Music AI results
    const localSections = cached.result.sections || [];
    const cloudSections = musicAIResult.sections || [];

    // Try name-based matching first
    let merged;
    if (cloudSections.length === localSections.length) {
      // Same section count — merge by position, replacing low-confidence ones
      merged = localSections.map((localSec, i) => {
        if (localSec.confidence < 75) {
          return { ...cloudSections[i], refined: true };
        }
        return localSec;
      });
    } else {
      // Different section counts — try name-based matching
      merged = localSections.map(localSec => {
        if (localSec.confidence < 75) {
          const match = cloudSections.find(cs =>
            cs.name.toLowerCase() === localSec.name.toLowerCase()
          );
          if (match) return { ...match, refined: true };
        }
        return localSec;
      });

      // If most sections are still low confidence, replace entirely with Music AI
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

    // Recalculate overall confidence
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
```

- [ ] **Step 3: Commit**

```bash
git add server/music-ai.js server/index.js
git commit -m "feat(server): add Music AI API client and refinement endpoint"
```

---

### Task 6: PWA Import Modal UI

**Files:**
- Modify: `index.html` — add import modal HTML, CSS, and JS

- [ ] **Step 1: Add import modal CSS**

Add before the closing `</style>` tag in `index.html`:

```css
/* Import modal */
#import-modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: var(--bg); z-index: 160; flex-direction: column; overflow-y: auto; }
#import-modal.visible { display: flex; }
#import-header { padding: 16px; display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid var(--badge-bg); }
#import-header h2 { font-size: 24px; font-weight: bold; }
#import-close { background: var(--badge-bg); color: var(--text); border: none; border-radius: 8px;
  padding: 8px 16px; font-size: 16px; cursor: pointer; min-height: 44px; }
#import-tabs { display: flex; gap: 0; border-bottom: 1px solid var(--badge-bg); }
.import-tab { flex: 1; padding: 12px; border: none; background: transparent; color: var(--text-muted);
  font-size: 15px; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; }
.import-tab.active { color: #4a9eff; border-bottom-color: #4a9eff; }
.import-panel { display: none; padding: 16px; flex: 1; }
.import-panel.active { display: flex; flex-direction: column; gap: 12px; }
.import-input { padding: 12px; border: 2px solid var(--badge-bg); border-radius: 8px;
  background: var(--bg); color: var(--text); font-size: 16px; width: 100%; }
.import-input:focus { border-color: #4a9eff; outline: none; }
#import-analyze-btn, #import-search-btn { padding: 12px; border: none; border-radius: 8px;
  background: #4a9eff; color: #fff; font-size: 16px; font-weight: 600; cursor: pointer;
  min-height: 48px; }
#import-analyze-btn:disabled, #import-search-btn:disabled { opacity: 0.5; cursor: not-allowed; }
#import-upload-label { display: flex; align-items: center; justify-content: center; padding: 32px;
  border: 2px dashed var(--text-muted); border-radius: 12px; cursor: pointer; color: var(--text-muted);
  font-size: 16px; }
#import-upload-input { display: none; }
.search-result { display: flex; gap: 12px; padding: 12px; border: 1px solid var(--badge-bg);
  border-radius: 8px; cursor: pointer; align-items: center; }
.search-result:active { background: var(--badge-bg); }
.search-result-info { flex: 1; }
.search-result-title { font-size: 14px; font-weight: 600; }
.search-result-duration { font-size: 12px; color: var(--text-muted); }

/* Progress screen */
#import-progress { display: none; padding: 16px; flex: 1; }
#import-progress.active { display: flex; flex-direction: column; gap: 8px; justify-content: center; }
.progress-step { display: flex; align-items: center; gap: 8px; font-size: 15px; padding: 4px 0; }
.progress-step .icon { width: 20px; text-align: center; }
.progress-step.done { color: #4ade80; }
.progress-step.active { color: var(--text); font-weight: 600; }
.progress-step.pending { color: var(--text-muted); }

/* Results screen */
#import-results { display: none; padding: 16px; flex: 1; overflow-y: auto; }
#import-results.active { display: flex; flex-direction: column; gap: 12px; }
#result-meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
#result-meta .badge { background: var(--badge-bg); padding: 4px 10px; border-radius: 12px; font-size: 13px; }
#result-title-input, #result-artist-input { padding: 8px; border: 1px solid var(--badge-bg);
  border-radius: 6px; background: var(--bg); color: var(--text); font-size: 16px; width: 100%; }
#result-title-input { font-size: 20px; font-weight: bold; }
#confidence-banner { padding: 10px; border-radius: 8px; text-align: center; font-size: 14px; font-weight: 600; }
#confidence-banner.high { background: rgba(74,222,128,0.15); color: #4ade80; }
#confidence-banner.medium { background: rgba(251,191,36,0.15); color: #fbbf24; }
#confidence-banner.low { background: rgba(239,68,68,0.15); color: #ef4444; }
#refine-btn { padding: 10px; border: none; border-radius: 8px; background: #8b5cf6; color: #fff;
  font-size: 14px; cursor: pointer; min-height: 44px; }
.result-section { display: flex; gap: 8px; align-items: baseline; }
.result-section-label { min-width: 72px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
.result-section-chords { flex: 1; font-size: 18px; font-weight: bold; letter-spacing: 1px; word-spacing: 10px; }
.chord-high { color: #4ade80; }
.chord-medium { color: #fbbf24; }
.chord-low { color: #ef4444; }
#result-capo { padding: 8px; border: 1px solid var(--badge-bg); border-radius: 6px;
  background: var(--bg); color: var(--text); font-size: 14px; }
#save-song-btn { padding: 14px; border: none; border-radius: 8px; background: #4ade80; color: #000;
  font-size: 16px; font-weight: 600; cursor: pointer; min-height: 48px; margin-top: auto; }
```

- [ ] **Step 2: Add import modal HTML**

Add before the closing `</body>` tag, after the chord picker div:

```html
<!-- Import song modal -->
<div id="import-modal">
  <div id="import-header">
    <h2>Add Song</h2>
    <button id="import-close">Cancel</button>
  </div>
  <div id="import-tabs">
    <button class="import-tab active" data-tab="url">URL</button>
    <button class="import-tab" data-tab="search">Search</button>
    <button class="import-tab" data-tab="upload">Upload</button>
  </div>

  <!-- URL panel -->
  <div class="import-panel active" id="panel-url">
    <input type="text" class="import-input" id="import-url-input" placeholder="Paste YouTube URL...">
    <button id="import-analyze-btn">Analyze</button>
  </div>

  <!-- Search panel -->
  <div class="import-panel" id="panel-search">
    <input type="text" class="import-input" id="import-search-input" placeholder="Song name + artist...">
    <button id="import-search-btn">Search</button>
    <div id="search-results"></div>
  </div>

  <!-- Upload panel -->
  <div class="import-panel" id="panel-upload">
    <label id="import-upload-label">
      Tap to select audio file (mp3, wav, m4a, flac)
      <input type="file" id="import-upload-input" accept="audio/*">
    </label>
  </div>

  <!-- Progress screen -->
  <div id="import-progress"></div>

  <!-- Results screen -->
  <div id="import-results">
    <input type="text" id="result-title-input" placeholder="Song title">
    <input type="text" id="result-artist-input" placeholder="Artist">
    <div id="result-meta"></div>
    <div id="confidence-banner"></div>
    <button id="refine-btn" style="display:none">Refine with Music AI</button>
    <div id="result-sections"></div>
    <div style="display:flex;gap:8px;align-items:center">
      <span style="font-size:13px;color:var(--text-muted)">Capo:</span>
      <select id="result-capo">
        <option value="">None</option>
        <option value="1">1</option><option value="2">2</option><option value="3">3</option>
        <option value="4">4</option><option value="5">5</option><option value="6">6</option>
        <option value="7">7</option><option value="8">8</option><option value="9">9</option>
      </select>
    </div>
    <button id="save-song-btn">Save Song</button>
  </div>
</div>
```

- [ ] **Step 3: Commit CSS + HTML**

```bash
git add index.html
git commit -m "feat(ui): add import modal HTML and CSS"
```

---

### Task 7: PWA Import Logic (JS)

**Files:**
- Modify: `index.html` — add import JavaScript

- [ ] **Step 1: Add server connection + import logic**

Add the following JavaScript inside the existing `<script>` block in `index.html`, before the `// ===== INIT =====` section (or at the end of the script block):

```javascript
// ===== SONG PERSISTENCE =====
// Custom (imported) songs are stored in localStorage separately from default SONGS
function getCustomSongs() {
  try { return JSON.parse(localStorage.getItem('cheatsheet-songs-custom') || '[]'); }
  catch { return []; }
}

function saveCustomSongs(songs) {
  localStorage.setItem('cheatsheet-songs-custom', JSON.stringify(songs));
}

function getAllSongs() {
  // Merge default SONGS with custom imported songs
  return [...SONGS, ...getCustomSongs()];
}

// ===== IMPORT SONG =====
let serverUrl = null;
let serverToken = null; // API token for droplet auth
let currentAnalysis = null;

// Set your droplet API token here (matches API_TOKEN in server/.env)
const DROPLET_API_TOKEN = ''; // Fill in after deployment, or leave empty for local-only

async function detectServer() {
  // Try local first
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 2500);
    const res = await fetch('http://localhost:3000/api/health', { signal: controller.signal });
    if (res.ok) {
      const data = await res.json();
      serverUrl = 'http://localhost:3000';
      serverToken = null; // no token needed for local
      return data;
    }
  } catch {}

  // Fall back to droplet
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);
    const headers = {};
    if (DROPLET_API_TOKEN) headers['x-api-token'] = DROPLET_API_TOKEN;
    const res = await fetch('https://api.stratlab.uk/api/health', {
      signal: controller.signal, headers
    });
    if (res.ok) {
      const data = await res.json();
      serverUrl = 'https://api.stratlab.uk';
      serverToken = DROPLET_API_TOKEN;
      return data;
    }
  } catch {}

  return null;
}

// Helper: add auth headers when talking to droplet
function getHeaders(contentType) {
  const h = {};
  if (contentType) h['Content-Type'] = contentType;
  if (serverToken) h['x-api-token'] = serverToken;
  return h;
}

function showImportModal() {
  document.getElementById('import-modal').classList.add('visible');
  // Reset to URL tab
  switchImportTab('url');
  document.getElementById('import-url-input').value = '';
  document.getElementById('import-search-input').value = '';
  document.getElementById('search-results').innerHTML = '';
  hideImportProgress();
  hideImportResults();
}

function hideImportModal() {
  document.getElementById('import-modal').classList.remove('visible');
  currentAnalysis = null;
}

function switchImportTab(tab) {
  document.querySelectorAll('.import-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.import-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('panel-' + tab);
  if (panel) panel.classList.add('active');
  hideImportProgress();
  hideImportResults();
}

function showImportProgress(stages) {
  const el = document.getElementById('import-progress');
  el.innerHTML = stages.map((s, i) => `
    <div class="progress-step pending" id="progress-${s.id}">
      <span class="icon">${i === 0 ? '&#9679;' : '&#9675;'}</span>
      <span>${s.label}</span>
    </div>
  `).join('');
  el.classList.add('active');
  // Hide panels
  document.querySelectorAll('.import-panel').forEach(p => p.classList.remove('active'));
}

function updateProgress(stage) {
  const steps = document.querySelectorAll('.progress-step');
  let found = false;
  steps.forEach(step => {
    if (step.id === 'progress-' + stage) {
      step.className = 'progress-step active';
      step.querySelector('.icon').innerHTML = '&#9679;';
      found = true;
    } else if (!found) {
      step.className = 'progress-step done';
      step.querySelector('.icon').innerHTML = '&#10003;';
    }
  });
}

function hideImportProgress() {
  const el = document.getElementById('import-progress');
  el.classList.remove('active');
  el.innerHTML = '';
}

function showImportResults(result) {
  currentAnalysis = result;
  hideImportProgress();

  document.getElementById('result-title-input').value = result.title || '';
  document.getElementById('result-artist-input').value = result.artist || '';
  document.getElementById('result-meta').innerHTML = `
    <span class="badge">Key: ${result.key}</span>
    <span class="badge">${result.bpm} BPM</span>
    <span class="badge">${result.timeSignature}</span>
  `;

  // Confidence banner
  const banner = document.getElementById('confidence-banner');
  const conf = result.confidence;
  if (result.source === 'music-ai') {
    banner.textContent = 'Analyzed with Music AI';
    banner.className = 'high';
  } else if (conf >= 80) {
    banner.textContent = `Local detection: ${conf}% confident`;
    banner.className = 'high';
  } else if (conf >= 60) {
    banner.textContent = `Local detection: ${conf}% confident — review recommended`;
    banner.className = 'medium';
  } else {
    banner.textContent = `Local detection: ${conf}% confident — refinement recommended`;
    banner.className = 'low';
  }

  // Refine button
  const refineBtn = document.getElementById('refine-btn');
  if (result.canRefine) {
    const estCost = result.duration ? '$' + (result.duration / 60 * 0.04).toFixed(2) : '~$0.16';
    refineBtn.textContent = `Refine with Music AI (${estCost})`;
    refineBtn.style.display = '';
  } else {
    refineBtn.style.display = 'none';
  }

  // Sections
  const sectionsEl = document.getElementById('result-sections');
  sectionsEl.innerHTML = '';
  (result.sections || []).forEach(sec => {
    const row = document.createElement('div');
    row.className = 'result-section';

    const label = document.createElement('span');
    label.className = 'result-section-label section-' + sectionType(sec.name);
    label.textContent = sec.name;

    const chords = document.createElement('span');
    chords.className = 'result-section-chords';

    // Color chords by confidence if detail available
    if (sec.chordsDetail) {
      sec.chordsDetail.forEach((c, i) => {
        if (i > 0) chords.appendChild(document.createTextNode('  '));
        const span = document.createElement('span');
        span.textContent = c.chord;
        span.className = c.confidence > 0.85 ? 'chord-high' :
                         c.confidence > 0.6 ? 'chord-medium' : 'chord-low';
        chords.appendChild(span);
      });
    } else {
      chords.textContent = sec.chords;
    }

    row.appendChild(label);
    row.appendChild(chords);
    sectionsEl.appendChild(row);
  });

  document.getElementById('result-capo').value = '';
  document.getElementById('import-results').classList.add('active');
}

function hideImportResults() {
  document.getElementById('import-results').classList.remove('active');
}

async function analyzeFromURL(url) {
  const server = await detectServer();
  if (!server) {
    alert('Cannot connect to analysis server. Make sure the local server is running.');
    return;
  }

  // If no local ML and hitting cloud, confirm cost
  if (!server.localML) {
    if (!confirm('Local server unavailable. Analyze with Music AI (~$0.16)?')) return;
  }

  showImportProgress([
    { id: 'downloading', label: 'Downloading audio...' },
    { id: 'analyzing', label: 'Analyzing audio...' },
    { id: 'formatting', label: 'Formatting results...' },
  ]);

  try {
    const response = await fetch(serverUrl + '/api/analyze/url', {
      method: 'POST',
      headers: getHeaders('application/json'),
      body: JSON.stringify({ url }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line
      let eventType = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) eventType = line.slice(7);
        else if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (eventType === 'progress') updateProgress(data.stage);
          else if (eventType === 'result') showImportResults(data);
          else if (eventType === 'error') {
            hideImportProgress();
            alert('Analysis failed: ' + data.message);
          }
        }
      }
    }
  } catch (err) {
    hideImportProgress();
    alert('Analysis failed: ' + err.message);
  }
}

async function analyzeFromUpload(file) {
  const server = await detectServer();
  if (!server) {
    alert('Cannot connect to analysis server. Make sure the local server is running.');
    return;
  }

  if (!server.localML) {
    if (!confirm('Local server unavailable. Analyze with Music AI (~$0.16)?')) return;
  }

  if (file.size > 50 * 1024 * 1024) {
    alert('File exceeds 50MB limit. Try a compressed format (MP3).');
    return;
  }

  showImportProgress([
    { id: 'uploading', label: 'Uploading file...' },
    { id: 'analyzing', label: 'Analyzing audio...' },
    { id: 'formatting', label: 'Formatting results...' },
  ]);

  try {
    const formData = new FormData();
    formData.append('audio', file);

    const response = await fetch(serverUrl + '/api/analyze/upload', {
      method: 'POST',
      body: formData,
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop();
      let eventType = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) eventType = line.slice(7);
        else if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (eventType === 'progress') updateProgress(data.stage);
          else if (eventType === 'result') showImportResults(data);
          else if (eventType === 'error') {
            hideImportProgress();
            alert('Analysis failed: ' + data.message);
          }
        }
      }
    }
  } catch (err) {
    hideImportProgress();
    alert('Analysis failed: ' + err.message);
  }
}

async function searchAndAnalyze(query) {
  const server = await detectServer();
  if (!server) {
    alert('Cannot connect to analysis server. Make sure the local server is running.');
    return;
  }

  const searchBtn = document.getElementById('import-search-btn');
  searchBtn.disabled = true;
  searchBtn.textContent = 'Searching...';

  try {
    const res = await fetch(serverUrl + '/api/analyze/search', {
      method: 'POST',
      headers: getHeaders('application/json'),
      body: JSON.stringify({ query }),
    });
    const { results } = await res.json();

    const container = document.getElementById('search-results');
    container.innerHTML = '';
    results.forEach(r => {
      const div = document.createElement('div');
      div.className = 'search-result';
      div.innerHTML = `
        ${r.thumbnail ? `<img src="${r.thumbnail}" style="width:64px;height:48px;border-radius:4px;object-fit:cover">` : ''}
        <div class="search-result-info">
          <div class="search-result-title">${escapeHtml(r.title)}</div>
          <div class="search-result-duration">${r.duration}</div>
        </div>
      `;
      div.addEventListener('click', () => analyzeFromURL(r.url));
      container.appendChild(div);
    });
  } catch (err) {
    alert('Search failed: ' + err.message);
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = 'Search';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function saveSongFromAnalysis() {
  if (!currentAnalysis) return;

  const title = document.getElementById('result-title-input').value.trim() || 'Untitled';
  const artist = document.getElementById('result-artist-input').value.trim() || 'Unknown';
  const capoVal = document.getElementById('result-capo').value;

  // Check for duplicates across ALL songs (default + custom)
  const allSongs = getAllSongs();
  const existingIdx = allSongs.findIndex(s =>
    s.title.toLowerCase() === title.toLowerCase() &&
    s.artist.toLowerCase() === artist.toLowerCase()
  );
  if (existingIdx !== -1) {
    if (!confirm(`"${title}" by ${artist} already exists. Replace it?`)) return;
    // Remove from custom songs if it's there
    const customSongs = getCustomSongs();
    const customIdx = customSongs.findIndex(s =>
      s.title.toLowerCase() === title.toLowerCase() &&
      s.artist.toLowerCase() === artist.toLowerCase()
    );
    if (customIdx !== -1) customSongs.splice(customIdx, 1);
    saveCustomSongs(customSongs);
    // Clean up localStorage for old song
    localStorage.removeItem('cheatsheet-sections-' + title);
    localStorage.removeItem('cheatsheet-notes-' + title);
    localStorage.removeItem('cheatsheet-key-' + title);
  }

  const newSong = {
    title,
    artist,
    key: currentAnalysis.key,
    bpm: currentAnalysis.bpm,
    timeSignature: currentAnalysis.timeSignature,
    capo: capoVal ? parseInt(capoVal) : null,
    notes: `Auto-detected (${currentAnalysis.source}, ${currentAnalysis.confidence}% confidence)`,
    sections: (currentAnalysis.sections || []).map(s => ({
      name: s.name,
      chords: s.chords,
    })),
    imported: true, // flag to distinguish from default SONGS
  };

  // Persist to localStorage
  const customSongs = getCustomSongs();
  customSongs.push(newSong);
  saveCustomSongs(customSongs);

  // Update in-memory list and navigate to new song
  currentIndex = getAllSongs().length - 1;
  hideImportModal();
  renderSong();
}

async function refineWithMusicAI() {
  if (!currentAnalysis?.jobId) return;

  const refineBtn = document.getElementById('refine-btn');
  refineBtn.disabled = true;
  refineBtn.textContent = 'Refining...';

  try {
    const response = await fetch(serverUrl + '/api/analyze/refine/' + currentAnalysis.jobId, {
      method: 'POST',
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop();
      let eventType = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) eventType = line.slice(7);
        else if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (eventType === 'result') {
            data.title = currentAnalysis.title;
            data.artist = currentAnalysis.artist;
            showImportResults(data);
          }
          else if (eventType === 'error') alert('Refinement failed: ' + data.message);
        }
      }
    }
  } catch (err) {
    alert('Refinement failed: ' + err.message);
  } finally {
    refineBtn.disabled = false;
  }
}
```

- [ ] **Step 2: Update existing code to use getAllSongs()**

The existing app references `SONGS[currentIndex]` directly. Now that imported songs live in localStorage, we need the app to see them too. The existing `getSetlistSongs()` function likely already handles this — check how it works. If it uses `SONGS` directly, update it to call `getAllSongs()` instead. Key places to check and update:

- `renderSong()` — uses `getSetlistSongs()` which may reference `SONGS`
- `showChordPicker()` — references `SONGS[currentIndex]`
- `saveCurrentStructure()` — references `SONGS[currentIndex]`
- `resetEdits()` — references `SONGS[currentIndex]`
- Any other direct `SONGS[currentIndex]` reference

The fix: create a helper `getCurrentSong()` that returns from `getAllSongs()` and use it everywhere.

- [ ] **Step 3: Wire up event listeners**

Add to the init section of `index.html` (where other event listeners are set up):

```javascript
// Import modal triggers
document.getElementById('import-close').addEventListener('click', hideImportModal);
document.querySelectorAll('.import-tab').forEach(tab => {
  tab.addEventListener('click', () => switchImportTab(tab.dataset.tab));
});
document.getElementById('import-analyze-btn').addEventListener('click', () => {
  const url = document.getElementById('import-url-input').value.trim();
  if (url) analyzeFromURL(url);
});
document.getElementById('import-search-btn').addEventListener('click', () => {
  const query = document.getElementById('import-search-input').value.trim();
  if (query) searchAndAnalyze(query);
});
document.getElementById('import-search-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const query = e.target.value.trim();
    if (query) searchAndAnalyze(query);
  }
});
document.getElementById('import-upload-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) analyzeFromUpload(file);
});
document.getElementById('save-song-btn').addEventListener('click', saveSongFromAnalysis);
document.getElementById('refine-btn').addEventListener('click', refineWithMusicAI);
```

- [ ] **Step 3: Add "Add Song" button to trigger import**

Find the setlist `#setlist-add-btn` button text and change it to also add an import option, OR add a new button. The simplest approach: add an import button in the bottom bar or header.

Add as the first button inside the `#controls` div in `index.html` (before the Edit button), at line ~242:

```html
<button id="import-btn" style="font-size:20px;font-weight:bold">+</button>
```

Add event listener in init:
```javascript
document.getElementById('import-btn').addEventListener('click', showImportModal);
```

- [ ] **Step 4: Test the full UI flow**

```bash
cd server && node index.js
# Open index.html in browser, click "+" button
# Paste a YouTube URL and click Analyze
# Verify: progress steps animate, results display with confidence colors
# Click Save Song — verify it appears in the song list
```

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(ui): add import modal with URL, search, upload and confidence display"
```

---

### Task 8: Droplet Deployment

**Files:**
- Create: `server/deploy.sh` — deployment script for DigitalOcean droplet

- [ ] **Step 1: Create deploy.sh**

```bash
#!/bin/bash
# Deploy gm-setlist-server to DigitalOcean droplet
# Usage: ./deploy.sh

DROPLET_IP="144.126.224.140"
DROPLET_USER="root"
APP_DIR="/opt/gm-setlist-server"

echo "Deploying to $DROPLET_IP..."

# Sync server files (exclude node_modules, .venv, .env)
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.venv' \
  --exclude '.env' \
  --exclude '*.pyc' \
  ./ "$DROPLET_USER@$DROPLET_IP:$APP_DIR/"

# Install dependencies and restart
ssh "$DROPLET_USER@$DROPLET_IP" << 'EOF'
cd /opt/gm-setlist-server

# Install Node.js if needed
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# Install yt-dlp if needed
if ! command -v yt-dlp &> /dev/null; then
  pip3 install yt-dlp
fi

npm install --production

# Create .env if it doesn't exist
if [ ! -f .env ]; then
  cp .env.example .env
  echo ">>> IMPORTANT: Edit /opt/gm-setlist-server/.env and add your MUSIC_AI_API_KEY"
fi

# Create/update systemd service
cat > /etc/systemd/system/gm-setlist.service << 'SERVICE'
[Unit]
Description=GM Setlist Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/gm-setlist-server
ExecStart=/usr/bin/node index.js
Restart=on-failure
EnvironmentFile=/opt/gm-setlist-server/.env

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable gm-setlist
systemctl restart gm-setlist
echo "Service restarted. Status:"
systemctl status gm-setlist --no-pager
EOF

echo "Done! Set up DNS: api.stratlab.uk -> $DROPLET_IP"
```

- [ ] **Step 2: Make executable**

```bash
chmod +x server/deploy.sh
```

- [ ] **Step 3: Set up Cloudflare DNS**

In Cloudflare dashboard for `stratlab.uk`:
- Add A record: `api` → `144.126.224.140` (proxy OFF for API traffic, or ON if you want SSL)

- [ ] **Step 4: Commit**

```bash
git add server/deploy.sh
git commit -m "feat(server): add deployment script for DigitalOcean droplet"
```

---

### Task 9: Integration Testing & Polish

**Files:**
- Modify: `index.html` — final polish
- Modify: `server/index.js` — rate limiting for droplet

- [ ] **Step 1: Add simple rate limiting for droplet**

Add to `server/index.js` after the CORS middleware:

```javascript
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
```

- [ ] **Step 2: Test full end-to-end flow**

1. Start server: `cd server && node index.js`
2. Open `index.html` in browser
3. Test URL flow: paste YouTube URL → verify progress → verify results → save song
4. Test search flow: search "Careless Whisper" → pick result → verify analysis → save
5. Test upload flow: upload an MP3 → verify analysis → save
6. Test duplicate detection: try saving same song again
7. Verify saved songs appear in the song list and render correctly

- [ ] **Step 3: Commit final polish**

```bash
git add server/index.js index.html
git commit -m "feat: add rate limiting and integration polish"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Server scaffold + health + token auth | `server/package.json`, `server/.gitignore`, `server/index.js`, `server/.env.example` |
| 2 | YouTube extraction | `server/youtube.js` |
| 3 | Python ML analysis | `server/analyze.py`, `server/requirements.txt` |
| 4 | Analysis orchestrator + SSE | `server/analyze.js`, `server/index.js` |
| 5 | Music AI API client (skeleton) | `server/music-ai.js`, `server/index.js` |
| 6 | Import modal UI (HTML/CSS) | `index.html` |
| 7 | Import logic + song persistence (JS) | `index.html` |
| 8 | Droplet deployment | `server/deploy.sh` |
| 9 | Integration testing + polish | `server/index.js`, `index.html` |
