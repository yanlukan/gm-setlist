# Smart Chord Detection System — Design Spec

## Problem

Adding songs to the GM Setlist app is fully manual — the user types in every chord for every section. For a gigging musician preparing setlists, this is slow and error-prone. There's no way to analyze audio and auto-populate chord charts.

## Solution

A hybrid chord detection system that extracts chords, key, tempo, and song sections from audio (YouTube, file upload, or search by name). Local detection runs first (free, fast), with Music AI API as a paid high-accuracy refinement. Per-chord confidence scoring lets the user see at a glance which chords might be wrong.

## User Flows

### Flow 1: Add song via YouTube URL
1. User taps "Add Song" button in the app
2. Import modal opens with three tabs: URL / Search / Upload
3. User pastes YouTube URL
4. Progress indicator: "Downloading audio..."
5. Server extracts audio via `yt-dlp`
6. Progress indicator: "Detecting chords..." → "Detecting sections..."
7. Local detection engine analyzes: chords, key, tempo, time signature, sections
8. Results displayed with per-chord confidence colors (green/yellow/red)
9. Overall confidence banner shown — if <75%, offers "Refine with Music AI?"
10. User taps "Refine" → Music AI API re-analyzes → replaces low-confidence sections
11. User reviews, optionally edits in existing edit mode, then saves

### Flow 1b: Droplet fallback path
1. Steps 1-3 same as above
2. Local server unreachable → PWA shows: "Local server unavailable. Analyze with Music AI (~$0.16)?"
3. User confirms → droplet handles YouTube extraction + Music AI analysis
4. Results displayed (no confidence colors — Music AI accuracy is consistently high)
5. User reviews, edits, saves

### Flow 2: Add song via search
1. User types song name + artist in search tab
2. Server searches YouTube via `youtube-search-api`
3. Top results shown with thumbnails and duration
4. User picks one → same flow as Flow 1, step 4 onward

### Flow 3: Add song via audio file
1. User taps Upload tab
2. Selects audio file from device (mp3, wav, m4a, flac)
3. Max file size: 50MB, max duration: 10 minutes
4. File sent to server
5. Same flow as Flow 1, step 6 onward

### Error handling
- **Video unavailable:** "This video is unavailable or region-restricted. Try uploading the audio file directly."
- **yt-dlp rate limited:** "YouTube download temporarily blocked. Try again in a few minutes or upload the file."
- **File too large:** "File exceeds 50MB limit. Try a compressed format (MP3)."
- **Analysis failed:** "Chord detection failed. Try a different recording or upload a cleaner audio file."

## Architecture

```
┌─────────────────────────────────┐
│          PWA (index.html)       │
│  ┌───────────────────────────┐  │
│  │     Import Modal UI       │  │
│  │  [URL] [Search] [Upload]  │  │
│  └───────────┬───────────────┘  │
│              │ REST + SSE        │
└──────────────┼──────────────────┘
               │
    ┌──────────▼──────────┐
    │  Try localhost:3000  │──timeout 2.5s──┐
    └──────────┬──────────┘                 │
               │                            │
    ┌──────────▼──────────┐    ┌────────────▼─────────────┐
    │  Local Server        │    │  Droplet Fallback         │
    │  (MacBook M5 Pro)    │    │  (1GB DO, LON1)           │
    │                      │    │  api.stratlab.uk          │
    │  - yt-dlp            │    │                           │
    │  - YouTube search    │    │  - yt-dlp                 │
    │  - Essentia (key,    │    │  - YouTube search         │
    │    tempo, beats,     │    │  - Music AI API only      │
    │    chords)           │    │  (no local detection      │
    │  - allin1 (sections) │    │   — 1GB too tight)        │
    │  - Music AI API      │    │                           │
    └─────────────────────┘    └───────────────────────────┘
```

Note: The droplet (1GB RAM) cannot run local ML models (Essentia + allin1 need ~2-4GB). Droplet always uses Music AI API directly and requires user confirmation (paid). The droplet is accessed via `api.stratlab.uk` (DNS A record → 144.126.224.140), never by raw IP.

## Components

### 1. Backend Server (Node.js + Python)

**Node.js Express server** — API layer, YouTube handling, orchestration:

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check + capabilities (`{ localML: true/false }`) |
| `/api/analyze/url` | POST | Accept YouTube URL, extract audio, analyze. Returns SSE stream. |
| `/api/analyze/search` | POST | Search YouTube, return results |
| `/api/analyze/upload` | POST | Accept audio file upload (max 50MB), analyze. Returns SSE stream. |
| `/api/analyze/refine/:jobId` | POST | Re-analyze with Music AI API |

**SSE progress events** during analysis:
```
event: progress
data: { "stage": "downloading", "message": "Downloading audio..." }

event: progress
data: { "stage": "chords", "message": "Detecting chords..." }

event: progress
data: { "stage": "sections", "message": "Detecting sections..." }

event: progress
data: { "stage": "metadata", "message": "Detecting key & tempo..." }

event: result
data: { ...fullAnalysisResult }

event: error
data: { "message": "Video unavailable or region-restricted." }
```

**Python subprocess** — ML models for local detection:

| Model | Purpose | Output |
|---|---|---|
| Essentia | Key detection, tempo/BPM, beat positions, **chord recognition** | `{ key: "Dm", bpm: 120, beats: [...], chords: [{ time, duration, chord, confidence }] }` |
| allin1 | Section segmentation | `[{ label: "verse", start: 12.5, end: 45.2 }, ...]` |

Essentia handles both audio features AND chord recognition — no need for a separate CREMA dependency. Essentia has native Apple Silicon support and active maintenance.

The Node server spawns a Python process, passes the audio file path, receives JSON results.

**Section label normalization** (allin1 → app labels):

| allin1 output | App label |
|---|---|
| `verse` | Verse |
| `chorus` | Chorus |
| `bridge` | Bridge |
| `pre-chorus` | Pre-Chorus |
| `intro` | Intro |
| `outro` | Outro |
| `inst` | Instrumental |
| `solo` | Solo |
| `break` | Break |
| (unknown) | Section |

**Music AI API client:**
- Called when user taps "Refine with Music AI"
- Or called directly on droplet (with user confirmation)
- Endpoints: upload file → create job → poll status → get results
- Returns chords, key, tempo, sections as JSON

### 2. PWA Additions

**Import Modal** — new overlay triggered by "Add Song" button:

```
┌────────────────────────────────┐
│  Add Song                   ✕  │
├────────────────────────────────┤
│  [  URL  ] [ Search ] [Upload] │
├────────────────────────────────┤
│                                │
│  Paste YouTube URL:            │
│  ┌──────────────────────────┐  │
│  │ https://youtube.com/...  │  │
│  └──────────────────────────┘  │
│                                │
│  [ Analyze ]                   │
│                                │
└────────────────────────────────┘
```

**Progress Screen** — shown during analysis:

```
┌────────────────────────────────┐
│  Analyzing...                  │
├────────────────────────────────┤
│                                │
│  ✓ Downloading audio           │
│  ● Detecting chords...         │
│  ○ Detecting sections          │
│  ○ Detecting key & tempo       │
│                                │
└────────────────────────────────┘
```

**Results Screen** — shows detected song data before saving:

```
┌────────────────────────────────┐
│  ← Back          Save Song  ✓  │
├────────────────────────────────┤
│  Song Title (editable)         │
│  Artist (editable)             │
│  Key: Dm  BPM: 120  4/4       │
│  Capo: [none ▾]                │
│                                │
│  Overall: 82% confident        │
│  [Refine with Music AI — $0.16]│
├────────────────────────────────┤
│  INTRO        Dm7  Gm7        │  ← green = high confidence
│  VERSE        Dm7  Gm7        │
│  PRE-CHORUS   F  G  F  G      │  ← yellow chord highlighted
│  CHORUS       Dm  F  G  C     │
│  OUTRO        Dm  F  G  C     │
├────────────────────────────────┤
│  Notes: (auto-generated)       │
└────────────────────────────────┘
```

Confidence colors:
- Green (>85%): high confidence, likely correct
- Yellow (60-85%): moderate, worth checking
- Red (<60%): low confidence, probably needs fixing

Capo field is manual — set by user before saving (auto-detection is unreliable).

### 3. Detection Pipeline Logic

```
analyzeAudio(filePath):
    if localMLAvailable:
        localResult = runLocalDetection(filePath)
        return {
            source: "local",
            confidence: localResult.avgConfidence,
            chords: localResult.chords,      // with per-chord confidence
            key: localResult.key,
            bpm: localResult.bpm,
            sections: localResult.sections,
            canRefine: true
        }
    else:
        // Droplet path — user already confirmed paid analysis
        musicAIResult = callMusicAI(filePath)
        return {
            source: "music-ai",
            confidence: 0.95,               // Music AI doesn't expose confidence,
            chords: musicAIResult.chords,   // but accuracy is consistently high
            key: musicAIResult.key,
            bpm: musicAIResult.bpm,
            sections: musicAIResult.sections,
            canRefine: false                 // already at max quality
        }

refineWithMusicAI(jobId):
    musicAIResult = callMusicAI(storedFilePath)
    // Replace entire sections where average local confidence < 75%
    // Keep local results for sections where confidence was already high
    // Section-level replacement avoids time-grid alignment issues
    for each section:
        if section.avgConfidence < 0.75:
            section.chords = musicAIResult.matchingSection.chords
    return mergedResult
```

### 4. Server Fallback Logic

```
PWA connection logic (runs on each analysis request):
    try:
        response = fetch("http://localhost:3000/api/health", { timeout: 2500 })
        if response.ok:
            serverUrl = "http://localhost:3000"
            // Check capabilities
            if response.localML:
                mode = "local"    // free local detection
            else:
                mode = "cloud"    // needs user confirmation
    catch:
        serverUrl = "https://api.stratlab.uk"
        mode = "cloud"            // needs user confirmation

    if mode == "cloud":
        showConfirmation("Local server unavailable. Analyze with Music AI (~$0.16)?")
        if !confirmed: abort
```

### 5. Duplicate Detection

Before saving a new song, check existing songs:
```
if existingSong with same title+artist (case-insensitive):
    prompt: "This song already exists. Replace existing or keep both?"
```

## Data Format

Detection results map directly to the existing `SONGS` format:

```javascript
// Existing format (songs.js)
{
    title: "Too Funky",
    artist: "George Michael",
    key: "Dm",
    bpm: 98,
    timeSignature: "4/4",
    capo: null,
    notes: "Auto-detected. Local confidence: 82%",
    sections: [
        { name: "Intro", chords: "Dm7  Gm7" },
        { name: "Verse", chords: "Dm7  Gm7" },
        ...
    ]
}
```

No schema changes needed. The detection pipeline outputs data that slots directly into the existing song object.

## Tech Stack

### Local server (MacBook)
- **Runtime:** Node.js 20+
- **Framework:** Express
- **YouTube:** `yt-dlp` (binary) + `youtube-search-api` (npm)
- **Local ML:** Python 3.11+ subprocess
  - `essentia` — key, tempo, beat detection, **chord recognition** (native ARM/Apple Silicon support)
  - `allin1` — section segmentation (verse/chorus/bridge/etc.)
- **Cloud API:** Music AI REST client (`node-fetch`)
- **Storage:** Temp directory for audio files, cleaned after analysis

### Droplet (fallback)
- Same Node.js server, minus Python ML models
- Always routes to Music AI API (with user confirmation)
- `yt-dlp` for YouTube extraction only
- Accessed via `api.stratlab.uk` (DNS A record → droplet IP)
- Rate-limited + simple token header for abuse prevention

### PWA
- No new dependencies — vanilla JS additions to existing `index.html`
- `fetch()` + `EventSource` (SSE) for API calls with progress
- Inline styles consistent with existing CSS variables

## Security

- Music AI API key stored as environment variable on server, never exposed to client
- YouTube URLs validated before processing (must match YouTube URL patterns)
- Audio files cleaned from temp storage after analysis (configurable retention)
- Droplet API rate-limited (10 requests/hour) and requires a simple token header
- No raw IP addresses in client code — use `api.stratlab.uk` domain

## Costs

- **Local detection:** Free (runs on MacBook)
- **Music AI refinement:** ~$0.04/min → ~$0.16 per average song
- **Droplet:** Existing DO droplet, no additional cost
- **Domain:** `stratlab.uk` already owned
- **Estimated monthly cost:** If refining ~50 songs/month = ~$8/month

## Out of Scope (for now)

- iReal Pro import (can add later as additional import source)
- Chord ai ChordPro import (can add later)
- Microphone/live recording input
- Batch analysis of multiple songs
- User accounts or authentication
- Storing analysis history
- Automatic capo detection
