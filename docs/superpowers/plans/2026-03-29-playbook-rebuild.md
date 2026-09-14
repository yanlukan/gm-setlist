# PlayBook Rebuild — React + Vite PWA

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the PlayBook setlist/chord-sheet app as a React + TypeScript PWA with drag-and-drop setlist management, reliable IndexedDB persistence, and iPad-optimized UI.

**Architecture:** Single-page PWA with React components, Zustand for state management, dnd-kit for drag-and-drop, idb for IndexedDB persistence. No backend required — builds to static files for GitHub Pages. The chord detection server remains separate (used at home, exports JSON for import).

**Tech Stack:** React 18, TypeScript, Vite, Zustand, dnd-kit, idb, Vitest + React Testing Library

---

## File Structure

```
app/                          # New app directory (alongside existing server/)
  index.html                  # Vite entry point
  vite.config.ts              # Vite config with PWA plugin
  tsconfig.json
  package.json
  public/
    manifest.json             # PWA manifest
  src/
    main.tsx                  # React entry point
    App.tsx                   # Root component with routing
    types.ts                  # Song, Section, Setlist type definitions
    data/
      songs.ts                # Hardcoded GM Tribute songs (ported from songs.js)
      chords-db.ts            # Chord diagram voicings database
    store/
      use-store.ts            # Zustand store: songs, setlists, edits, UI state
      persistence.ts          # IndexedDB read/write via idb
    music/
      theory.ts               # Transpose, diatonic chords, enharmonic logic
    components/
      layout/
        TopBar.tsx            # Controls row: edit, stage, theme, transpose
        BottomBar.tsx         # Song navigation tabs
      song/
        SongSheet.tsx         # Main chord sheet display (sections + notes)
        SectionRow.tsx        # Single section: label + chords
        AutoScaleText.tsx     # Font auto-scaling wrapper
      edit/
        EditMode.tsx          # Edit mode wrapper: contentEditable sections
        ChordPicker.tsx       # Diatonic + all chords panel
        SectionPicker.tsx     # Add section type selector
      setlist/
        SetlistScreen.tsx     # Full-screen setlist manager
        SetlistSongItem.tsx   # Draggable song row in setlist
        AddSongPicker.tsx     # Song picker for adding to setlist
      diagrams/
        ChordDiagram.tsx      # SVG chord diagram renderer
        DiagramsBar.tsx       # Horizontal strip of song's chord diagrams
        VoicingPicker.tsx     # Modal to pick voicing for a chord
      import/
        ImportModal.tsx       # Import flow: URL/search/upload tabs
        ProgressView.tsx      # SSE progress display
        ResultsView.tsx       # Analysis results editor
      shared/
        Badge.tsx             # Pill-shaped badge component
        Modal.tsx             # Reusable modal overlay
        TapTempo.tsx          # Tap tempo modal
    hooks/
      use-swipe.ts            # Touch swipe navigation hook
      use-wake-lock.ts        # Screen wake lock API hook
    styles/
      theme.css               # CSS custom properties (dark/light/stage)
      global.css              # Base styles, typography, layout
    sw.ts                     # Service worker (cache-first)
    tests/
      store/
        use-store.test.ts     # Store logic tests
        persistence.test.ts   # IndexedDB persistence tests
      music/
        theory.test.ts        # Transpose/theory tests
      components/
        SongSheet.test.tsx    # Song display tests
        SetlistScreen.test.tsx # Setlist drag-and-drop tests
```

**Key design decisions:**
- `types.ts` is the single source of truth for data shapes — every component imports from here
- `use-store.ts` manages ALL state (current song, edit mode, setlists, theme) — no prop drilling
- `persistence.ts` syncs Zustand state to IndexedDB on every mutation — edits never lost
- Components are small (<150 lines each) and single-responsibility
- The existing `server/` directory is untouched — it stays as the chord detection backend

---

## Task 1: Project Scaffolding

**Files:**
- Create: `app/package.json`
- Create: `app/tsconfig.json`
- Create: `app/vite.config.ts`
- Create: `app/index.html`
- Create: `app/src/main.tsx`
- Create: `app/src/App.tsx`
- Create: `app/src/types.ts`
- Create: `app/src/styles/theme.css`
- Create: `app/src/styles/global.css`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "playbook",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
cd app && npm install react react-dom zustand && \
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create vite.config.ts**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/gm-setlist/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
  },
})
```

- [ ] **Step 5: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <link rel="manifest" href="manifest.json" />
  <title>PlayBook</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 6: Create types.ts**

```ts
export interface Section {
  name: string
  chords: string
}

export interface Song {
  title: string
  shortTitle?: string
  artist: string
  key: string
  bpm: number
  timeSignature: string
  capo: number | null
  notes: string
  sections: Section[]
  imported?: boolean
}

export interface SongEdits {
  sections?: Section[]
  notes?: string
  key?: string
  bpm?: number
}

export interface Setlist {
  id: string
  name: string
  songTitles: string[]
}

export interface SetlistData {
  lists: Record<string, Setlist>
  activeId: string
}

export type Theme = 'dark' | 'light'
export type ViewMode = 'normal' | 'stage'
```

- [ ] **Step 7: Create theme.css**

```css
:root {
  --bg: #1a1a1a;
  --text: #ffffff;
  --text-muted: #888888;
  --badge-bg: #333333;
  --edit-border: #f59e0b;
  --picker-bg: #2a2a2a;
  --accent: #4a9eff;
  --success: #4ade80;
  --danger: #ef4444;
  --section-verse: #4a9eff;
  --section-chorus: #4ade80;
  --section-bridge: #fb923c;
  --section-prechorus: #c084fc;
  --section-intro: #888888;
  --section-default: #888888;
}

body.light {
  --bg: #ffffff;
  --text: #1a1a1a;
  --text-muted: #666666;
  --badge-bg: #e5e7eb;
  --edit-border: #d97706;
  --picker-bg: #f3f4f6;
}

body.stage {
  --bg: #000000;
  --text: #ffffff;
  --text-muted: #999999;
  --badge-bg: #222222;
  --picker-bg: #111111;
  --section-verse: #ffffff;
  --section-chorus: #ffffff;
  --section-bridge: #ffffff;
  --section-prechorus: #ffffff;
  --section-intro: #cccccc;
  --section-default: #cccccc;
}
```

- [ ] **Step 8: Create global.css**

```css
@import './theme.css';

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg);
  color: var(--text);
  overflow: hidden;
  height: 100dvh;
  -webkit-user-select: none;
  user-select: none;
}

#root {
  height: 100dvh;
  display: flex;
  flex-direction: column;
}

button {
  font-family: inherit;
  cursor: pointer;
  border: none;
  background: none;
  color: var(--text);
  -webkit-tap-highlight-color: transparent;
}

input, select {
  font-family: inherit;
  background: var(--badge-bg);
  color: var(--text);
  border: 1px solid var(--badge-bg);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 16px;
}
```

- [ ] **Step 9: Create main.tsx**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 10: Create App.tsx**

```tsx
export function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: 16, color: 'var(--text)' }}>
        PlayBook — loading...
      </div>
    </div>
  )
}
```

- [ ] **Step 11: Create test setup**

Create `app/src/tests/setup.ts`:
```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 12: Create public/manifest.json**

```json
{
  "name": "PlayBook",
  "short_name": "PlayBook",
  "start_url": "./",
  "display": "standalone",
  "background_color": "#1a1a1a",
  "theme_color": "#1a1a1a"
}
```

- [ ] **Step 13: Verify dev server starts**

Run: `cd app && npm run dev`
Expected: Vite dev server starts, browser shows "PlayBook — loading..."

- [ ] **Step 14: Commit**

```bash
git add app/
git commit -m "feat: scaffold React + Vite + TypeScript project"
```

---

## Task 2: Music Theory Engine

**Files:**
- Create: `app/src/music/theory.ts`
- Create: `app/src/tests/music/theory.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest'
import {
  transposeChord,
  getDiatonicChords,
  sectionColor,
  shouldUseFlats,
  getCurrentKey,
  getAllChordNames,
} from '../../music/theory'

describe('transposeChord', () => {
  it('transposes a major chord up', () => {
    expect(transposeChord('C', 2, false)).toBe('D')
  })

  it('transposes a minor chord', () => {
    expect(transposeChord('Am', 3, false)).toBe('Cm')
  })

  it('transposes with flats', () => {
    expect(transposeChord('A', 1, true)).toBe('Bb')
  })

  it('transposes a slash chord', () => {
    expect(transposeChord('C/E', 2, false)).toBe('D/F#')
  })

  it('handles 7th chords', () => {
    expect(transposeChord('G7', 2, false)).toBe('A7')
  })

  it('wraps around octave', () => {
    expect(transposeChord('B', 1, false)).toBe('C')
  })

  it('transposes down', () => {
    expect(transposeChord('D', -2, false)).toBe('C')
  })
})

describe('getDiatonicChords', () => {
  it('returns major key diatonic triads', () => {
    const chords = getDiatonicChords('C')
    expect(chords).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'])
  })

  it('returns minor key diatonic triads', () => {
    const chords = getDiatonicChords('Am')
    expect(chords).toEqual(['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G'])
  })

  it('handles flat keys', () => {
    const chords = getDiatonicChords('Bb')
    expect(chords[0]).toBe('Bb')
  })
})

describe('shouldUseFlats', () => {
  it('returns true for F major', () => {
    expect(shouldUseFlats('F', 0)).toBe(true)
  })

  it('returns false for G major', () => {
    expect(shouldUseFlats('G', 0)).toBe(false)
  })

  it('returns true for Dm', () => {
    expect(shouldUseFlats('Dm', 0)).toBe(true)
  })
})

describe('sectionColor', () => {
  it('returns verse color for verse labels', () => {
    expect(sectionColor('Verse')).toBe('var(--section-verse)')
    expect(sectionColor('Verse 1')).toBe('var(--section-verse)')
  })

  it('returns chorus color', () => {
    expect(sectionColor('Chorus')).toBe('var(--section-chorus)')
  })

  it('returns bridge color', () => {
    expect(sectionColor('Bridge')).toBe('var(--section-bridge)')
  })

  it('returns prechorus color', () => {
    expect(sectionColor('Pre-Chorus')).toBe('var(--section-prechorus)')
  })

  it('returns intro color', () => {
    expect(sectionColor('Intro')).toBe('var(--section-intro)')
    expect(sectionColor('Outro')).toBe('var(--section-intro)')
  })

  it('returns default for unknown', () => {
    expect(sectionColor('Solo')).toBe('var(--section-default)')
  })
})

describe('getAllChordNames', () => {
  it('returns 144 chords (12 roots x 12 qualities)', () => {
    const chords = getAllChordNames(false)
    expect(chords.length).toBe(144)
    expect(chords).toContain('C')
    expect(chords).toContain('Am7')
    expect(chords).toContain('F#dim')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx vitest run src/tests/music/theory.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement theory.ts**

```ts
const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLATS  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

const FLAT_KEYS = new Set([
  'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
  'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm',
])

const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11]
const MAJOR_QUALITIES = ['', 'm', 'm', '', '', 'm', 'dim']
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10]
const MINOR_QUALITIES = ['m', 'dim', '', 'm', 'm', '', '']

const QUALITIES = ['', 'm', '7', 'm7', 'maj7', 'sus4', 'sus2', 'dim', 'aug', '9', 'add9', '6']

function parseChord(chord: string): { root: string; quality: string } {
  const match = chord.match(/^([A-G][#b]?)(.*)$/)
  if (!match) return { root: chord, quality: '' }
  return { root: match[1], quality: match[2] }
}

function noteIndex(note: string): number {
  let idx = SHARPS.indexOf(note)
  if (idx === -1) idx = FLATS.indexOf(note)
  return idx
}

function noteName(index: number, useFlats: boolean): string {
  const i = ((index % 12) + 12) % 12
  return useFlats ? FLATS[i] : SHARPS[i]
}

export function transposeChord(chord: string, semitones: number, useFlats: boolean): string {
  if (chord.includes('/')) {
    const [main, bass] = chord.split('/')
    return transposeChord(main, semitones, useFlats) + '/' + transposeChord(bass, semitones, useFlats)
  }
  const { root, quality } = parseChord(chord)
  const idx = noteIndex(root)
  if (idx === -1) return chord
  return noteName(idx + semitones, useFlats) + quality
}

export function shouldUseFlats(key: string, _semitones: number): boolean {
  return FLAT_KEYS.has(key)
}

export function getDiatonicChords(key: string): string[] {
  const isMinor = key.endsWith('m') && !key.endsWith('dim')
  const root = isMinor ? key.slice(0, -1) : key
  const rootIdx = noteIndex(root)
  if (rootIdx === -1) return []

  const useFlats = FLAT_KEYS.has(key)
  const intervals = isMinor ? MINOR_INTERVALS : MAJOR_INTERVALS
  const qualities = isMinor ? MINOR_QUALITIES : MAJOR_QUALITIES

  return intervals.map((interval, i) =>
    noteName(rootIdx + interval, useFlats) + qualities[i]
  )
}

export function getCurrentKey(originalKey: string, editedKey?: string): string {
  return editedKey || originalKey
}

export function sectionColor(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('verse')) return 'var(--section-verse)'
  if (lower.includes('chorus')) return 'var(--section-chorus)'
  if (lower.includes('bridge')) return 'var(--section-bridge)'
  if (lower.includes('pre-chorus') || lower.includes('prechorus')) return 'var(--section-prechorus)'
  if (lower.includes('intro') || lower.includes('outro')) return 'var(--section-intro)'
  return 'var(--section-default)'
}

export function getAllChordNames(useFlats: boolean): string[] {
  const notes = useFlats ? FLATS : SHARPS
  const chords: string[] = []
  for (const note of notes) {
    for (const q of QUALITIES) {
      chords.push(note + q)
    }
  }
  return chords
}

export function getDiatonic7ths(key: string): string[] {
  const isMinor = key.endsWith('m') && !key.endsWith('dim')
  const root = isMinor ? key.slice(0, -1) : key
  const rootIdx = noteIndex(root)
  if (rootIdx === -1) return []

  const useFlats = FLAT_KEYS.has(key)
  const intervals = isMinor ? MINOR_INTERVALS : MAJOR_INTERVALS
  const seventh_qualities = isMinor
    ? ['m7', 'm7b5', 'maj7', 'm7', 'm7', 'maj7', '7']
    : ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7b5']

  return intervals.map((interval, i) =>
    noteName(rootIdx + interval, useFlats) + seventh_qualities[i]
  )
}
```

- [ ] **Step 4: Run tests**

Run: `cd app && npx vitest run src/tests/music/theory.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/music/ app/src/tests/music/
git commit -m "feat: music theory engine — transpose, diatonic chords, section colors"
```

---

## Task 3: Song Data and Chord Database

**Files:**
- Create: `app/src/data/songs.ts`
- Create: `app/src/data/chords-db.ts`

- [ ] **Step 1: Port songs data**

Create `app/src/data/songs.ts` — port the 16 hardcoded songs from the existing `songs.js` file. Use typed `Song[]`:

```ts
import type { Song } from '../types'

export const DEFAULT_SONGS: Song[] = [
  {
    title: "Faith",
    artist: "George Michael",
    key: "B",
    bpm: 96,
    timeSignature: "4/4",
    capo: null,
    notes: "",
    sections: [
      { name: "Intro/Riff", chords: "B  E" },
      { name: "Verse", chords: "B  E  B  E  B  E  B" },
      // ... complete all sections from existing songs.js
    ],
  },
  // ... all 16 songs ported exactly
]
```

Read the existing `/Users/krys/Documents/coding/cheetsheetForGuitarPlaying/songs.js` and port every song with exact same data. Do NOT omit any songs or sections.

- [ ] **Step 2: Port chord diagram database**

Create `app/src/data/chords-db.ts` — port the `CHORD_DB` object from `index.html`. Type it:

```ts
export interface ChordVoicing {
  f: (number | null)[]  // 6 fret values: null=muted, 0=open, N=fret
  s: number             // start fret (0=nut position)
  l: string             // position label
}

export const CHORD_DB: Record<string, ChordVoicing[]> = {
  'C': [
    { f: [null, 3, 2, 0, 1, 0], s: 0, l: 'Open' },
  ],
  // ... port all ~55 entries from existing CHORD_DB
}
```

Read the existing `CHORD_DB` from `index.html` (search for `const CHORD_DB`) and port every entry exactly.

- [ ] **Step 3: Verify songs compile**

Run: `cd app && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add app/src/data/
git commit -m "feat: port song data and chord diagram database"
```

---

## Task 4: IndexedDB Persistence Layer

**Files:**
- Create: `app/src/store/persistence.ts`
- Create: `app/src/tests/store/persistence.test.ts`

- [ ] **Step 1: Install idb**

Run: `cd app && npm install idb`

- [ ] **Step 2: Write failing tests**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db, saveSongEdits, getSongEdits, saveSetlistData, getSetlistData, saveCustomSongs, getCustomSongs, saveTheme, getTheme } from '../../store/persistence'

beforeEach(async () => {
  const database = await db()
  const tx = database.transaction(['songEdits', 'setlists', 'customSongs', 'settings'], 'readwrite')
  await tx.objectStore('songEdits').clear()
  await tx.objectStore('setlists').clear()
  await tx.objectStore('customSongs').clear()
  await tx.objectStore('settings').clear()
  await tx.done
})

describe('song edits persistence', () => {
  it('saves and retrieves song edits', async () => {
    await saveSongEdits('Faith', {
      sections: [{ name: 'Verse', chords: 'A B C' }],
      notes: 'test note',
      key: 'C',
    })
    const edits = await getSongEdits('Faith')
    expect(edits?.sections).toEqual([{ name: 'Verse', chords: 'A B C' }])
    expect(edits?.notes).toBe('test note')
    expect(edits?.key).toBe('C')
  })

  it('returns undefined for non-existent song', async () => {
    const edits = await getSongEdits('Nonexistent')
    expect(edits).toBeUndefined()
  })
})

describe('setlist persistence', () => {
  it('saves and retrieves setlist data', async () => {
    const data = {
      lists: { default: { id: 'default', name: 'Test', songTitles: ['Faith'] } },
      activeId: 'default',
    }
    await saveSetlistData(data)
    const result = await getSetlistData()
    expect(result?.lists.default.songTitles).toEqual(['Faith'])
  })
})

describe('custom songs persistence', () => {
  it('saves and retrieves custom songs', async () => {
    const songs = [{
      title: 'New Song', artist: 'Me', key: 'C', bpm: 120,
      timeSignature: '4/4', capo: null, notes: '', sections: [],
      imported: true,
    }]
    await saveCustomSongs(songs)
    const result = await getCustomSongs()
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('New Song')
  })
})

describe('theme persistence', () => {
  it('saves and retrieves theme', async () => {
    await saveTheme('light')
    expect(await getTheme()).toBe('light')
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd app && npx vitest run src/tests/store/persistence.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement persistence.ts**

```ts
import { openDB, type IDBPDatabase } from 'idb'
import type { Song, SongEdits, SetlistData, Theme } from '../types'

const DB_NAME = 'playbook'
const DB_VERSION = 1

let dbInstance: IDBPDatabase | null = null

export async function db(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore('songEdits', { keyPath: 'title' })
      db.createObjectStore('setlists')
      db.createObjectStore('customSongs')
      db.createObjectStore('settings')
    },
  })
  return dbInstance
}

export async function saveSongEdits(title: string, edits: SongEdits): Promise<void> {
  const d = await db()
  await d.put('songEdits', { title, ...edits })
}

export async function getSongEdits(title: string): Promise<SongEdits | undefined> {
  const d = await db()
  const result = await d.get('songEdits', title)
  if (!result) return undefined
  const { title: _, ...edits } = result
  return edits as SongEdits
}

export async function deleteSongEdits(title: string): Promise<void> {
  const d = await db()
  await d.delete('songEdits', title)
}

export async function saveSetlistData(data: SetlistData): Promise<void> {
  const d = await db()
  await d.put('setlists', data, 'current')
}

export async function getSetlistData(): Promise<SetlistData | undefined> {
  const d = await db()
  return d.get('setlists', 'current')
}

export async function saveCustomSongs(songs: Song[]): Promise<void> {
  const d = await db()
  await d.put('customSongs', songs, 'all')
}

export async function getCustomSongs(): Promise<Song[]> {
  const d = await db()
  return (await d.get('customSongs', 'all')) ?? []
}

export async function saveTheme(theme: Theme): Promise<void> {
  const d = await db()
  await d.put('settings', theme, 'theme')
}

export async function getTheme(): Promise<Theme | undefined> {
  const d = await db()
  return d.get('settings', 'theme')
}
```

- [ ] **Step 5: Install fake-indexeddb for tests**

Run: `cd app && npm install -D fake-indexeddb`

Update `app/src/tests/setup.ts`:
```ts
import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
```

- [ ] **Step 6: Run tests**

Run: `cd app && npx vitest run src/tests/store/persistence.test.ts`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add app/src/store/persistence.ts app/src/tests/store/ app/package.json app/package-lock.json
git commit -m "feat: IndexedDB persistence layer for songs, setlists, settings"
```

---

## Task 5: Zustand Store

**Files:**
- Create: `app/src/store/use-store.ts`
- Create: `app/src/tests/store/use-store.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../../store/use-store'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})

describe('song navigation', () => {
  it('starts at index 0', () => {
    expect(useStore.getState().currentIndex).toBe(0)
  })

  it('navigates to next song', () => {
    useStore.getState().nextSong()
    expect(useStore.getState().currentIndex).toBe(1)
  })

  it('navigates to previous song', () => {
    useStore.getState().nextSong()
    useStore.getState().nextSong()
    useStore.getState().prevSong()
    expect(useStore.getState().currentIndex).toBe(1)
  })

  it('clamps at bounds', () => {
    useStore.getState().prevSong()
    expect(useStore.getState().currentIndex).toBe(0)
  })

  it('navigates to specific index', () => {
    useStore.getState().goToSong(5)
    expect(useStore.getState().currentIndex).toBe(5)
  })
})

describe('current song', () => {
  it('returns the song at currentIndex from setlist', () => {
    const song = useStore.getState().currentSong()
    expect(song).toBeDefined()
    expect(song?.title).toBe('Faith')
  })
})

describe('edit mode', () => {
  it('starts not editing', () => {
    expect(useStore.getState().editMode).toBe(false)
  })

  it('toggles edit mode', () => {
    useStore.getState().toggleEditMode()
    expect(useStore.getState().editMode).toBe(true)
    useStore.getState().toggleEditMode()
    expect(useStore.getState().editMode).toBe(false)
  })
})

describe('song edits', () => {
  it('saves and retrieves section edits', () => {
    const sections = [{ name: 'Verse', chords: 'A B C' }]
    useStore.getState().saveSections('Faith', sections)
    const edited = useStore.getState().getEditedSections('Faith')
    expect(edited).toEqual(sections)
  })

  it('falls back to original sections when no edits', () => {
    const song = useStore.getState().currentSong()!
    const sections = useStore.getState().getEditedSections(song.title)
    expect(sections).toEqual(song.sections)
  })
})

describe('theme', () => {
  it('defaults to dark', () => {
    expect(useStore.getState().theme).toBe('dark')
  })

  it('toggles theme', () => {
    useStore.getState().toggleTheme()
    expect(useStore.getState().theme).toBe('light')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx vitest run src/tests/store/use-store.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement use-store.ts**

```ts
import { create } from 'zustand'
import type { Song, Section, SongEdits, SetlistData, Theme, ViewMode } from '../types'
import { DEFAULT_SONGS } from '../data/songs'
import * as persistence from './persistence'

interface SongEditsMap {
  [title: string]: SongEdits
}

interface StoreState {
  // Data
  songs: Song[]
  customSongs: Song[]
  edits: SongEditsMap
  setlistData: SetlistData

  // UI state
  currentIndex: number
  editMode: boolean
  theme: Theme
  viewMode: ViewMode
  diagramsVisible: boolean

  // Computed
  allSongs: () => Song[]
  setlistSongs: () => Song[]
  currentSong: () => Song | undefined
  getEditedSections: (title: string) => Section[]
  getEditedNotes: (title: string) => string
  getCurrentKey: (title: string) => string

  // Actions — navigation
  nextSong: () => void
  prevSong: () => void
  goToSong: (index: number) => void

  // Actions — editing
  toggleEditMode: () => void
  saveSections: (title: string, sections: Section[]) => void
  saveNotes: (title: string, notes: string) => void
  saveKey: (title: string, key: string) => void
  saveBpm: (title: string, bpm: number) => void
  resetEdits: (title: string) => void

  // Actions — setlists
  setActiveSetlist: (id: string) => void
  createSetlist: (name: string) => void
  deleteSetlist: (id: string) => void
  renameSetlist: (id: string, name: string) => void
  reorderSetlistSongs: (id: string, songTitles: string[]) => void
  addSongToSetlist: (id: string, songTitle: string) => void
  removeSongFromSetlist: (id: string, songTitle: string) => void

  // Actions — custom songs
  addCustomSong: (song: Song) => void

  // Actions — UI
  toggleTheme: () => void
  toggleViewMode: () => void
  toggleDiagrams: () => void

  // Initialization
  hydrate: () => Promise<void>
}

const defaultSetlistData: SetlistData = {
  lists: {
    default: {
      id: 'default',
      name: 'GM Tribute',
      songTitles: DEFAULT_SONGS.map(s => s.title),
    },
  },
  activeId: 'default',
}

export const useStore = create<StoreState>((set, get) => ({
  // Data
  songs: DEFAULT_SONGS,
  customSongs: [],
  edits: {},
  setlistData: defaultSetlistData,

  // UI state
  currentIndex: 0,
  editMode: false,
  theme: 'dark' as Theme,
  viewMode: 'normal' as ViewMode,
  diagramsVisible: true,

  // Computed
  allSongs: () => [...get().songs, ...get().customSongs],

  setlistSongs: () => {
    const { setlistData } = get()
    const setlist = setlistData.lists[setlistData.activeId]
    if (!setlist) return get().allSongs()
    const all = get().allSongs()
    return setlist.songTitles
      .map(t => all.find(s => s.title === t))
      .filter((s): s is Song => s !== undefined)
  },

  currentSong: () => {
    const songs = get().setlistSongs()
    const idx = get().currentIndex
    return songs[idx]
  },

  getEditedSections: (title: string) => {
    const edits = get().edits[title]
    if (edits?.sections) return edits.sections
    const song = get().allSongs().find(s => s.title === title)
    return song?.sections ?? []
  },

  getEditedNotes: (title: string) => {
    const edits = get().edits[title]
    if (edits?.notes !== undefined) return edits.notes
    const song = get().allSongs().find(s => s.title === title)
    return song?.notes ?? ''
  },

  getCurrentKey: (title: string) => {
    const edits = get().edits[title]
    if (edits?.key) return edits.key
    const song = get().allSongs().find(s => s.title === title)
    return song?.key ?? 'C'
  },

  // Navigation
  nextSong: () => {
    const max = get().setlistSongs().length - 1
    set(s => ({ currentIndex: Math.min(s.currentIndex + 1, max) }))
  },

  prevSong: () => {
    set(s => ({ currentIndex: Math.max(s.currentIndex - 1, 0) }))
  },

  goToSong: (index: number) => {
    const max = get().setlistSongs().length - 1
    set({ currentIndex: Math.max(0, Math.min(index, max)), editMode: false })
  },

  // Editing
  toggleEditMode: () => set(s => ({ editMode: !s.editMode })),

  saveSections: (title, sections) => {
    set(s => ({
      edits: { ...s.edits, [title]: { ...s.edits[title], sections } },
    }))
    persistence.saveSongEdits(title, { ...get().edits[title] })
  },

  saveNotes: (title, notes) => {
    set(s => ({
      edits: { ...s.edits, [title]: { ...s.edits[title], notes } },
    }))
    persistence.saveSongEdits(title, { ...get().edits[title] })
  },

  saveKey: (title, key) => {
    set(s => ({
      edits: { ...s.edits, [title]: { ...s.edits[title], key } },
    }))
    persistence.saveSongEdits(title, { ...get().edits[title] })
  },

  saveBpm: (title, bpm) => {
    set(s => ({
      edits: { ...s.edits, [title]: { ...s.edits[title], bpm } },
    }))
    persistence.saveSongEdits(title, { ...get().edits[title] })
  },

  resetEdits: (title) => {
    set(s => {
      const newEdits = { ...s.edits }
      delete newEdits[title]
      return { edits: newEdits }
    })
    persistence.deleteSongEdits(title)
  },

  // Setlists
  setActiveSetlist: (id) => {
    set(s => ({
      setlistData: { ...s.setlistData, activeId: id },
      currentIndex: 0,
    }))
    persistence.saveSetlistData(get().setlistData)
  },

  createSetlist: (name) => {
    const id = `sl-${Date.now()}`
    set(s => ({
      setlistData: {
        ...s.setlistData,
        lists: {
          ...s.setlistData.lists,
          [id]: { id, name, songTitles: [] },
        },
        activeId: id,
      },
      currentIndex: 0,
    }))
    persistence.saveSetlistData(get().setlistData)
  },

  deleteSetlist: (id) => {
    if (id === 'default') return
    set(s => {
      const lists = { ...s.setlistData.lists }
      delete lists[id]
      const activeId = s.setlistData.activeId === id ? 'default' : s.setlistData.activeId
      return { setlistData: { lists, activeId }, currentIndex: 0 }
    })
    persistence.saveSetlistData(get().setlistData)
  },

  renameSetlist: (id, name) => {
    set(s => ({
      setlistData: {
        ...s.setlistData,
        lists: {
          ...s.setlistData.lists,
          [id]: { ...s.setlistData.lists[id], name },
        },
      },
    }))
    persistence.saveSetlistData(get().setlistData)
  },

  reorderSetlistSongs: (id, songTitles) => {
    set(s => ({
      setlistData: {
        ...s.setlistData,
        lists: {
          ...s.setlistData.lists,
          [id]: { ...s.setlistData.lists[id], songTitles },
        },
      },
    }))
    persistence.saveSetlistData(get().setlistData)
  },

  addSongToSetlist: (id, songTitle) => {
    set(s => {
      const setlist = s.setlistData.lists[id]
      if (!setlist || setlist.songTitles.includes(songTitle)) return s
      return {
        setlistData: {
          ...s.setlistData,
          lists: {
            ...s.setlistData.lists,
            [id]: { ...setlist, songTitles: [...setlist.songTitles, songTitle] },
          },
        },
      }
    })
    persistence.saveSetlistData(get().setlistData)
  },

  removeSongFromSetlist: (id, songTitle) => {
    set(s => {
      const setlist = s.setlistData.lists[id]
      if (!setlist) return s
      return {
        setlistData: {
          ...s.setlistData,
          lists: {
            ...s.setlistData.lists,
            [id]: {
              ...setlist,
              songTitles: setlist.songTitles.filter(t => t !== songTitle),
            },
          },
        },
      }
    })
    persistence.saveSetlistData(get().setlistData)
  },

  // Custom songs
  addCustomSong: (song) => {
    set(s => ({ customSongs: [...s.customSongs, song] }))
    persistence.saveCustomSongs(get().customSongs)
  },

  // UI
  toggleTheme: () => {
    set(s => ({ theme: s.theme === 'dark' ? 'light' : 'dark' }))
    persistence.saveTheme(get().theme)
  },

  toggleViewMode: () => {
    set(s => ({ viewMode: s.viewMode === 'normal' ? 'stage' : 'normal' }))
  },

  toggleDiagrams: () => set(s => ({ diagramsVisible: !s.diagramsVisible })),

  // Hydration from IndexedDB
  hydrate: async () => {
    const [setlistData, customSongs, theme] = await Promise.all([
      persistence.getSetlistData(),
      persistence.getCustomSongs(),
      persistence.getTheme(),
    ])

    // Load all song edits
    const allSongs = [...DEFAULT_SONGS, ...(customSongs ?? [])]
    const editsEntries = await Promise.all(
      allSongs.map(async s => {
        const edits = await persistence.getSongEdits(s.title)
        return edits ? [s.title, edits] as const : null
      })
    )
    const edits: SongEditsMap = {}
    for (const entry of editsEntries) {
      if (entry) edits[entry[0]] = entry[1]
    }

    set({
      customSongs: customSongs ?? [],
      setlistData: setlistData ?? defaultSetlistData,
      theme: theme ?? 'dark',
      edits,
    })
  },
}))
```

- [ ] **Step 4: Run tests**

Run: `cd app && npx vitest run src/tests/store/use-store.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/store/use-store.ts app/src/tests/store/use-store.test.ts
git commit -m "feat: Zustand store with navigation, editing, setlists, persistence"
```

---

## Task 6: Shared Components (Badge, Modal)

**Files:**
- Create: `app/src/components/shared/Badge.tsx`
- Create: `app/src/components/shared/Modal.tsx`

- [ ] **Step 1: Create Badge component**

```tsx
import type { CSSProperties, ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  onClick?: () => void
  style?: CSSProperties
  className?: string
}

export function Badge({ children, onClick, style, className }: BadgeProps) {
  const baseStyle: CSSProperties = {
    background: 'var(--badge-bg)',
    padding: '4px 10px',
    borderRadius: 12,
    fontSize: 13,
    whiteSpace: 'nowrap',
    cursor: onClick ? 'pointer' : 'default',
    WebkitTapHighlightColor: 'transparent',
    ...style,
  }

  return (
    <span
      className={className}
      style={baseStyle}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      {children}
    </span>
  )
}
```

- [ ] **Step 2: Create Modal component**

```tsx
import type { ReactNode, CSSProperties } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  fullScreen?: boolean
  style?: CSSProperties
}

export function Modal({ open, onClose, children, fullScreen, style }: ModalProps) {
  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: fullScreen ? 'var(--bg)' : 'rgba(0,0,0,0.8)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: fullScreen ? 'stretch' : 'center',
        justifyContent: fullScreen ? 'stretch' : 'center',
        ...style,
      }}
      onClick={fullScreen ? undefined : (e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/src/components/shared/
git commit -m "feat: shared Badge and Modal components"
```

---

## Task 7: SongSheet and SectionRow — Core Display

**Files:**
- Create: `app/src/components/song/SectionRow.tsx`
- Create: `app/src/components/song/AutoScaleText.tsx`
- Create: `app/src/components/song/SongSheet.tsx`
- Create: `app/src/tests/components/SongSheet.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SongSheet } from '../../components/song/SongSheet'
import { useStore } from '../../store/use-store'

describe('SongSheet', () => {
  it('renders the current song title', () => {
    render(<SongSheet />)
    const song = useStore.getState().currentSong()!
    expect(screen.getByText(song.title)).toBeInTheDocument()
  })

  it('renders all section labels', () => {
    render(<SongSheet />)
    const song = useStore.getState().currentSong()!
    const sections = useStore.getState().getEditedSections(song.title)
    sections.forEach(s => {
      expect(screen.getByText(s.name.toUpperCase())).toBeInTheDocument()
    })
  })

  it('renders section chords', () => {
    render(<SongSheet />)
    const song = useStore.getState().currentSong()!
    const sections = useStore.getState().getEditedSections(song.title)
    // At least the first section's chords should be visible
    const firstChords = sections[0].chords
    expect(screen.getByText(firstChords)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/tests/components/SongSheet.test.tsx`
Expected: FAIL

- [ ] **Step 3: Create SectionRow**

```tsx
import { sectionColor } from '../../music/theory'

interface SectionRowProps {
  name: string
  chords: string
  fontSize: number
}

export function SectionRow({ name, chords, fontSize }: SectionRowProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'baseline',
      gap: 8,
    }}>
      <div style={{
        minWidth: 72,
        maxWidth: 90,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        color: sectionColor(name),
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        {name}
      </div>
      <div style={{
        fontSize,
        fontWeight: 'bold',
        letterSpacing: 1,
        wordSpacing: 14,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {chords}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create AutoScaleText**

```tsx
import { useRef, useEffect, useState, type ReactNode } from 'react'

interface AutoScaleTextProps {
  children: ReactNode
  maxFont?: number
  minFont?: number
}

export function AutoScaleText({ children, maxFont = 32, minFont = 18 }: AutoScaleTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState(maxFont)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let size = maxFont
    setFontSize(size)

    // Use requestAnimationFrame to measure after render
    requestAnimationFrame(() => {
      while (el.scrollHeight > el.clientHeight && size > minFont) {
        size -= 2
        setFontSize(size)
      }
    })
  }, [children, maxFont, minFont])

  return (
    <div ref={containerRef} data-fontsize={fontSize} style={{ flex: 1, overflow: 'hidden' }}>
      {typeof children === 'function' ? (children as (fs: number) => ReactNode)(fontSize) : children}
    </div>
  )
}
```

Note: The AutoScaleText passes fontSize down via render prop pattern. SongSheet will use it like:
```tsx
<AutoScaleText>
  {(fontSize) => sections.map(...<SectionRow fontSize={fontSize} />)}
</AutoScaleText>
```

Actually, let's simplify — use a simpler hook approach:

Replace with `app/src/hooks/use-auto-scale.ts`:

```ts
import { useRef, useEffect, useState } from 'react'

export function useAutoScale(deps: unknown[], maxFont = 32, minFont = 18): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState(maxFont)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let size = maxFont
    el.style.fontSize = size + 'px'

    const check = () => {
      while (el.scrollHeight > el.clientHeight && size > minFont) {
        size -= 2
        el.style.fontSize = size + 'px'
      }
      setFontSize(size)
    }

    requestAnimationFrame(check)
  }, [deps, maxFont, minFont])

  return [ref, fontSize]
}
```

- [ ] **Step 5: Create SongSheet**

```tsx
import { useStore } from '../../store/use-store'
import { SectionRow } from './SectionRow'
import { Badge } from '../shared/Badge'
import { useAutoScale } from '../../hooks/use-auto-scale'

export function SongSheet() {
  const currentSong = useStore(s => s.currentSong())
  const getEditedSections = useStore(s => s.getEditedSections)
  const getEditedNotes = useStore(s => s.getEditedNotes)
  const getCurrentKey = useStore(s => s.getCurrentKey)
  const currentIndex = useStore(s => s.currentIndex)
  const setlistSongs = useStore(s => s.setlistSongs())
  const editMode = useStore(s => s.editMode)

  if (!currentSong) return null

  const sections = getEditedSections(currentSong.title)
  const notes = getEditedNotes(currentSong.title)
  const currentKey = getCurrentKey(currentSong.title)
  const [chordAreaRef, fontSize] = useAutoScale(
    [currentSong.title, sections, editMode],
  )

  const keyDisplay = currentKey !== currentSong.key
    ? `Key: ${currentKey} (orig ${currentSong.key})`
    : `Key: ${currentKey}`

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      maxWidth: 700,
      width: '100%',
      margin: '0 auto',
      overflow: 'hidden',
    }}>
      {/* Song title */}
      <h1 style={{ fontSize: 28, fontWeight: 'bold', padding: '8px 16px 0' }}>
        {currentSong.title}
      </h1>

      {/* Meta badges */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        padding: '6px 16px',
        alignItems: 'center',
      }}>
        <Badge>{keyDisplay}</Badge>
        <Badge>{currentSong.bpm} BPM</Badge>
        <Badge>{currentSong.timeSignature}</Badge>
        {currentSong.capo && <Badge>Capo {currentSong.capo}</Badge>}
        <Badge style={{ marginLeft: 'auto', opacity: 0.6 }}>
          {currentIndex + 1} / {setlistSongs.length}
        </Badge>
      </div>

      {/* Chord sections */}
      <div
        ref={chordAreaRef}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: editMode ? 'flex-start' : 'center',
          gap: 4,
          padding: '8px 16px',
          overflow: editMode ? 'auto' : 'hidden',
          border: editMode ? '2px solid var(--edit-border)' : 'none',
          borderRadius: editMode ? 8 : 0,
          margin: editMode ? '0 8px' : 0,
        }}
      >
        {sections.map((section, i) => (
          <SectionRow
            key={`${section.name}-${i}`}
            name={section.name}
            chords={section.chords}
            fontSize={fontSize}
          />
        ))}
      </div>

      {/* Notes */}
      {notes && (
        <div style={{
          padding: '8px 16px',
          fontSize: 14,
          fontStyle: 'italic',
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--badge-bg)',
        }}>
          {notes}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Run tests**

Run: `cd app && npx vitest run src/tests/components/SongSheet.test.tsx`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add app/src/components/song/ app/src/hooks/ app/src/tests/components/
git commit -m "feat: SongSheet with section display, auto-scaling, meta badges"
```

---

## Task 8: TopBar and BottomBar Navigation

**Files:**
- Create: `app/src/components/layout/TopBar.tsx`
- Create: `app/src/components/layout/BottomBar.tsx`
- Create: `app/src/hooks/use-swipe.ts`

- [ ] **Step 1: Create TopBar**

```tsx
import { useStore } from '../../store/use-store'
import { transposeChord, shouldUseFlats, getCurrentKey } from '../../music/theory'

export function TopBar() {
  const editMode = useStore(s => s.editMode)
  const toggleEditMode = useStore(s => s.toggleEditMode)
  const viewMode = useStore(s => s.viewMode)
  const toggleViewMode = useStore(s => s.toggleViewMode)
  const theme = useStore(s => s.theme)
  const toggleTheme = useStore(s => s.toggleTheme)
  const currentSong = useStore(s => s.currentSong())
  const getEditedSections = useStore(s => s.getEditedSections)
  const getCurrentKeyFn = useStore(s => s.getCurrentKey)
  const saveSections = useStore(s => s.saveSections)
  const saveKey = useStore(s => s.saveKey)
  const resetEdits = useStore(s => s.resetEdits)

  const transpose = (semitones: number) => {
    if (!currentSong || editMode) return
    const currentKey = getCurrentKeyFn(currentSong.title)
    const useFlats = shouldUseFlats(currentKey, semitones)
    const notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
    const flats = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']

    const sections = getEditedSections(currentSong.title).map(s => ({
      name: s.name,
      chords: s.chords.split(/(\s+)/).map(token =>
        token.trim() ? transposeChord(token, semitones, useFlats) : token
      ).join(''),
    }))

    const newKey = transposeChord(currentKey, semitones, useFlats)
    saveSections(currentSong.title, sections)
    saveKey(currentSong.title, newKey)
  }

  const btnStyle = {
    padding: '6px 12px',
    fontSize: 14,
    borderRadius: 8,
    background: 'var(--badge-bg)',
    minHeight: 36,
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '8px 12px',
      maxWidth: 700,
      width: '100%',
      margin: '0 auto',
      flexWrap: 'wrap',
    }}>
      <button style={btnStyle} onClick={toggleEditMode}>
        {editMode ? 'Done' : 'Edit'}
      </button>
      <button style={btnStyle} onClick={toggleViewMode}>
        {viewMode === 'stage' ? 'Exit Stage' : 'Stage'}
      </button>
      <button style={btnStyle} onClick={toggleTheme}>
        {theme === 'dark' ? '\u2600' : '\u263E'}
      </button>
      {editMode && (
        <button
          style={{ ...btnStyle, color: 'var(--danger)' }}
          onClick={() => currentSong && resetEdits(currentSong.title)}
        >
          Reset
        </button>
      )}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
        <button style={btnStyle} onClick={() => transpose(-1)}>-</button>
        <button style={btnStyle} onClick={() => transpose(1)}>+</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create BottomBar**

```tsx
import { useRef, useEffect } from 'react'
import { useStore } from '../../store/use-store'

export function BottomBar() {
  const songs = useStore(s => s.setlistSongs())
  const currentIndex = useStore(s => s.currentIndex)
  const goToSong = useStore(s => s.goToSong)
  const navRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const activeBtn = nav.children[currentIndex] as HTMLElement
    if (!activeBtn) return
    requestAnimationFrame(() => {
      const scrollLeft = activeBtn.offsetLeft - nav.clientWidth / 2 + activeBtn.clientWidth / 2
      nav.scrollTo({ left: scrollLeft, behavior: 'smooth' })
    })
  }, [currentIndex])

  return (
    <div
      ref={navRef}
      style={{
        display: 'flex',
        gap: 6,
        padding: '12px 16px 44px 16px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        flexShrink: 0,
      }}
    >
      {songs.map((song, i) => (
        <button
          key={song.title}
          onClick={() => goToSong(i)}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            background: i === currentIndex ? 'var(--accent)' : 'var(--badge-bg)',
            color: i === currentIndex ? '#fff' : 'var(--text-muted)',
          }}
        >
          {song.shortTitle || song.title}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create swipe hook**

```ts
import { useRef, useEffect } from 'react'

interface SwipeHandlers {
  onSwipeLeft: () => void
  onSwipeRight: () => void
}

export function useSwipe(
  ref: React.RefObject<HTMLElement | null>,
  handlers: SwipeHandlers,
  enabled: boolean = true
) {
  const touchStart = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return

    const onTouchStart = (e: TouchEvent) => {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }

    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStart.current.x
      const dy = e.changedTouches[0].clientY - touchStart.current.y
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return
      if (dx < 0) handlers.onSwipeLeft()
      else handlers.onSwipeRight()
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [ref, handlers, enabled])
}
```

- [ ] **Step 4: Wire up App.tsx**

```tsx
import { useEffect, useRef } from 'react'
import { useStore } from './store/use-store'
import { TopBar } from './components/layout/TopBar'
import { BottomBar } from './components/layout/BottomBar'
import { SongSheet } from './components/song/SongSheet'
import { useSwipe } from './hooks/use-swipe'

export function App() {
  const hydrate = useStore(s => s.hydrate)
  const theme = useStore(s => s.theme)
  const viewMode = useStore(s => s.viewMode)
  const editMode = useStore(s => s.editMode)
  const nextSong = useStore(s => s.nextSong)
  const prevSong = useStore(s => s.prevSong)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => { hydrate() }, [hydrate])

  useEffect(() => {
    document.body.className = [
      theme === 'light' ? 'light' : '',
      viewMode === 'stage' ? 'stage' : '',
    ].filter(Boolean).join(' ')
  }, [theme, viewMode])

  useSwipe(sheetRef, {
    onSwipeLeft: nextSong,
    onSwipeRight: prevSong,
  }, !editMode)

  return (
    <>
      <TopBar />
      <div ref={sheetRef} style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        <SongSheet />
      </div>
      <BottomBar />
    </>
  )
}
```

- [ ] **Step 5: Verify in browser**

Run: `cd app && npm run dev`
Expected: Full song sheet visible with navigation, swipe between songs, bottom bar works, edit/stage/theme toggles work

- [ ] **Step 6: Commit**

```bash
git add app/src/components/layout/ app/src/hooks/use-swipe.ts app/src/App.tsx
git commit -m "feat: TopBar, BottomBar, swipe navigation, app wiring"
```

---

## Task 9: Setlist Screen with Drag-and-Drop

**Files:**
- Create: `app/src/components/setlist/SetlistScreen.tsx`
- Create: `app/src/components/setlist/SetlistSongItem.tsx`
- Create: `app/src/components/setlist/AddSongPicker.tsx`

- [ ] **Step 1: Install dnd-kit**

Run: `cd app && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

- [ ] **Step 2: Create SetlistSongItem (draggable)**

```tsx
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../../store/use-store'

interface Props {
  songTitle: string
  index: number
  setlistId: string
  onSelect: (index: number) => void
}

export function SetlistSongItem({ songTitle, index, setlistId, onSelect }: Props) {
  const removeSongFromSetlist = useStore(s => s.removeSongFromSetlist)
  const allSongs = useStore(s => s.allSongs())
  const song = allSongs.find(s => s.title === songTitle)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: songTitle })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  if (!song) return null

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        borderBottom: '1px solid var(--badge-bg)',
      }}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        style={{
          cursor: 'grab',
          padding: '8px 4px',
          fontSize: 18,
          color: 'var(--text-muted)',
          touchAction: 'none',
        }}
      >
        &#9776;
      </div>

      {/* Song info */}
      <div
        style={{ flex: 1, cursor: 'pointer' }}
        onClick={() => onSelect(index)}
      >
        <div style={{ fontWeight: 600 }}>
          {index + 1}. {song.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Key: {song.key} | {song.bpm} BPM | {song.timeSignature}
        </div>
      </div>

      {/* Remove */}
      <button
        onClick={() => removeSongFromSetlist(setlistId, songTitle)}
        style={{
          color: 'var(--danger)',
          fontSize: 13,
          padding: '4px 8px',
        }}
      >
        Remove
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Create AddSongPicker**

```tsx
import { useStore } from '../../store/use-store'

interface Props {
  setlistId: string
  currentTitles: string[]
  onClose: () => void
}

export function AddSongPicker({ setlistId, currentTitles, onClose }: Props) {
  const allSongs = useStore(s => s.allSongs())
  const addSongToSetlist = useStore(s => s.addSongToSetlist)

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'var(--bg)',
      zIndex: 210,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: 16,
        borderBottom: '1px solid var(--badge-bg)',
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 'bold' }}>Add Song</h2>
        <button onClick={onClose} style={{ fontSize: 16, padding: '4px 12px' }}>Done</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {allSongs.map(song => {
          const inList = currentTitles.includes(song.title)
          return (
            <div
              key={song.title}
              onClick={() => {
                if (!inList) addSongToSetlist(setlistId, song.title)
              }}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--badge-bg)',
                opacity: inList ? 0.3 : 1,
                cursor: inList ? 'default' : 'pointer',
              }}
            >
              {inList ? '\u2713 ' : '+ '}{song.title}
              <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 8 }}>
                {song.artist}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create SetlistScreen**

```tsx
import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { useStore } from '../../store/use-store'
import { SetlistSongItem } from './SetlistSongItem'
import { AddSongPicker } from './AddSongPicker'

interface Props {
  onClose: () => void
}

export function SetlistScreen({ onClose }: Props) {
  const setlistData = useStore(s => s.setlistData)
  const setActiveSetlist = useStore(s => s.setActiveSetlist)
  const createSetlist = useStore(s => s.createSetlist)
  const deleteSetlist = useStore(s => s.deleteSetlist)
  const renameSetlist = useStore(s => s.renameSetlist)
  const reorderSetlistSongs = useStore(s => s.reorderSetlistSongs)
  const goToSong = useStore(s => s.goToSong)

  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createName, setCreateName] = useState('')
  const [showAddSong, setShowAddSong] = useState(false)

  const activeSetlist = setlistData.lists[setlistData.activeId]
  const songTitles = activeSetlist?.songTitles ?? []

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = songTitles.indexOf(active.id as string)
    const newIndex = songTitles.indexOf(over.id as string)
    const newOrder = arrayMove(songTitles, oldIndex, newIndex)
    reorderSetlistSongs(setlistData.activeId, newOrder)
  }

  const handleSelectSong = (index: number) => {
    goToSong(index)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'var(--bg)',
      zIndex: 150,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottom: '1px solid var(--badge-bg)',
      }}>
        <h2 style={{ fontSize: 22, fontWeight: 'bold' }}>Setlists</h2>
        <button
          onClick={onClose}
          style={{ fontSize: 16, padding: '6px 14px', background: 'var(--accent)', borderRadius: 8, color: '#fff' }}
        >
          Done
        </button>
      </div>

      {/* Setlist tabs */}
      <div style={{
        display: 'flex',
        gap: 6,
        padding: '8px 16px',
        overflowX: 'auto',
        flexShrink: 0,
      }}>
        {Object.values(setlistData.lists).map(list => (
          <button
            key={list.id}
            onClick={() => setActiveSetlist(list.id)}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              background: list.id === setlistData.activeId ? 'var(--accent)' : 'var(--badge-bg)',
              color: list.id === setlistData.activeId ? '#fff' : 'var(--text-muted)',
            }}
          >
            {list.name}
          </button>
        ))}
        {creating ? (
          <input
            autoFocus
            value={createName}
            onChange={e => setCreateName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && createName.trim()) {
                createSetlist(createName.trim())
                setCreating(false)
                setCreateName('')
              }
            }}
            onBlur={() => { setCreating(false); setCreateName('') }}
            style={{ width: 120, fontSize: 14, padding: '6px 10px' }}
            placeholder="Name..."
          />
        ) : (
          <button
            onClick={() => setCreating(true)}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 14,
              background: 'var(--badge-bg)',
              color: 'var(--accent)',
              whiteSpace: 'nowrap',
            }}
          >
            + New
          </button>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, padding: '4px 16px' }}>
        {renaming ? (
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newName.trim()) {
                renameSetlist(setlistData.activeId, newName.trim())
                setRenaming(false)
              }
            }}
            onBlur={() => setRenaming(false)}
            style={{ fontSize: 14, padding: '4px 10px' }}
          />
        ) : (
          <button
            onClick={() => { setRenaming(true); setNewName(activeSetlist?.name ?? '') }}
            style={{ fontSize: 13, color: 'var(--text-muted)', padding: '4px 8px' }}
          >
            Rename
          </button>
        )}
        {setlistData.activeId !== 'default' && (
          <button
            onClick={() => deleteSetlist(setlistData.activeId)}
            style={{ fontSize: 13, color: 'var(--danger)', padding: '4px 8px' }}
          >
            Delete Setlist
          </button>
        )}
      </div>

      {/* Song list with drag-and-drop */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={songTitles}
            strategy={verticalListSortingStrategy}
          >
            {songTitles.map((title, i) => (
              <SetlistSongItem
                key={title}
                songTitle={title}
                index={i}
                setlistId={setlistData.activeId}
                onSelect={handleSelectSong}
              />
            ))}
          </SortableContext>
        </DndContext>

        <button
          onClick={() => setShowAddSong(true)}
          style={{
            width: '100%',
            padding: 16,
            fontSize: 16,
            color: 'var(--accent)',
            fontWeight: 600,
          }}
        >
          + Add Song
        </button>
      </div>

      {showAddSong && (
        <AddSongPicker
          setlistId={setlistData.activeId}
          currentTitles={songTitles}
          onClose={() => setShowAddSong(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Add setlist button to TopBar**

In `TopBar.tsx`, add state and button:

```tsx
const [showSetlist, setShowSetlist] = useState(false)

// Add this button after the theme toggle button:
<button style={btnStyle} onClick={() => setShowSetlist(true)}>Setlist</button>

// Add at end of component return, before closing <>:
{showSetlist && <SetlistScreen onClose={() => setShowSetlist(false)} />}
```

Import `SetlistScreen` and add `useState` import.

- [ ] **Step 6: Test drag-and-drop in browser**

Run: `cd app && npm run dev`
Expected: Setlist screen opens, songs reorder via drag handle, add/remove songs works, create/rename/delete setlists works

- [ ] **Step 7: Commit**

```bash
git add app/src/components/setlist/ app/src/components/layout/TopBar.tsx app/package.json app/package-lock.json
git commit -m "feat: setlist screen with dnd-kit drag-and-drop reordering"
```

---

## Task 10: Edit Mode — ChordPicker and SectionPicker

**Files:**
- Create: `app/src/components/edit/EditMode.tsx`
- Create: `app/src/components/edit/ChordPicker.tsx`
- Create: `app/src/components/edit/SectionPicker.tsx`

- [ ] **Step 1: Create ChordPicker**

```tsx
import { useState } from 'react'
import { getDiatonicChords, getDiatonic7ths, getAllChordNames, shouldUseFlats } from '../../music/theory'

interface Props {
  currentKey: string
  onSelect: (chord: string) => void
  onClose: () => void
}

export function ChordPicker({ currentKey, onSelect, onClose }: Props) {
  const [showAll, setShowAll] = useState(false)
  const useFlats = shouldUseFlats(currentKey, 0)
  const diatonic = getDiatonicChords(currentKey)
  const diatonic7ths = getDiatonic7ths(currentKey)
  const allChords = getAllChordNames(useFlats)

  const chipStyle = (highlight: boolean) => ({
    padding: '8px 12px',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600 as const,
    background: 'var(--badge-bg)',
    border: highlight ? '2px solid var(--accent)' : '2px solid transparent',
    cursor: 'pointer' as const,
  })

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      maxHeight: '45vh',
      background: 'var(--picker-bg)',
      borderTop: '2px solid var(--edit-border)',
      overflow: 'auto',
      zIndex: 100,
      padding: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <h3 style={{ fontSize: 14 }}>In Key ({currentKey})</h3>
        <button onClick={onClose} style={{ fontSize: 14, padding: '2px 8px' }}>Done</button>
      </div>

      {/* Diatonic triads */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {diatonic.map(c => (
          <button key={c} style={chipStyle(true)} onClick={() => onSelect(c)}>{c}</button>
        ))}
      </div>

      {/* Diatonic 7ths */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {diatonic7ths.map(c => (
          <button key={c} style={chipStyle(true)} onClick={() => onSelect(c)}>{c}</button>
        ))}
      </div>

      {/* Show all toggle */}
      {!showAll && (
        <button
          onClick={() => setShowAll(true)}
          style={{ fontSize: 13, color: 'var(--accent)', padding: '6px 0' }}
        >
          Show all chords...
        </button>
      )}

      {/* All chords */}
      {showAll && (
        <>
          <h3 style={{ fontSize: 14, margin: '8px 0' }}>All Chords</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {allChords.map(c => (
              <button key={c} style={chipStyle(false)} onClick={() => onSelect(c)}>{c}</button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create SectionPicker**

```tsx
import { useState } from 'react'

const SECTION_TYPES = ['Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Bridge', 'Solo', 'Breakdown', 'Instrumental', 'Outro']

interface Props {
  onSelect: (name: string) => void
  onClose: () => void
}

export function SectionPicker({ onSelect, onClose }: Props) {
  const [custom, setCustom] = useState(false)
  const [customName, setCustomName] = useState('')

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'var(--picker-bg)',
      borderTop: '2px solid var(--edit-border)',
      padding: 12,
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <h3 style={{ fontSize: 14 }}>Add Section</h3>
        <button onClick={onClose} style={{ fontSize: 14, padding: '2px 8px' }}>x</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {SECTION_TYPES.map(name => (
          <button
            key={name}
            onClick={() => onSelect(name)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 14,
              background: 'var(--badge-bg)',
            }}
          >
            {name}
          </button>
        ))}
        {custom ? (
          <input
            autoFocus
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && customName.trim()) {
                onSelect(customName.trim())
                setCustom(false)
                setCustomName('')
              }
            }}
            onBlur={() => { setCustom(false); setCustomName('') }}
            style={{ width: 120, fontSize: 14, padding: '8px 10px' }}
            placeholder="Custom..."
          />
        ) : (
          <button
            onClick={() => setCustom(true)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 14,
              background: 'var(--badge-bg)',
              border: '1px dashed var(--text-muted)',
            }}
          >
            Custom...
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Modify SectionRow to support edit mode**

Update `app/src/components/song/SectionRow.tsx` to accept edit props:

```tsx
import { useRef } from 'react'
import { sectionColor } from '../../music/theory'

interface SectionRowProps {
  name: string
  chords: string
  fontSize: number
  editMode?: boolean
  index?: number
  total?: number
  onChordsChange?: (chords: string) => void
  onLabelChange?: (name: string) => void
  onChordsFocus?: (el: HTMLDivElement) => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  onDelete?: () => void
}

export function SectionRow({
  name, chords, fontSize, editMode,
  index = 0, total = 1,
  onChordsChange, onLabelChange, onChordsFocus,
  onMoveUp, onMoveDown, onDelete,
}: SectionRowProps) {
  const chordsRef = useRef<HTMLDivElement>(null)

  return (
    <div style={{
      display: 'flex',
      alignItems: 'baseline',
      gap: 8,
    }}>
      {/* Edit controls */}
      {editMode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
          {index > 0 && (
            <button onClick={onMoveUp} style={{ fontSize: 10, padding: 2 }}>{'\u25B2'}</button>
          )}
          {index < total - 1 && (
            <button onClick={onMoveDown} style={{ fontSize: 10, padding: 2 }}>{'\u25BC'}</button>
          )}
          {total > 1 && (
            <button
              onClick={onDelete}
              style={{ fontSize: 10, padding: 2, color: 'var(--danger)' }}
            >
              x
            </button>
          )}
        </div>
      )}

      {/* Label */}
      <div
        contentEditable={editMode}
        suppressContentEditableWarning
        onBlur={e => onLabelChange?.(e.currentTarget.textContent?.trim() ?? name)}
        style={{
          minWidth: 72,
          maxWidth: 90,
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          color: sectionColor(name),
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          borderBottom: editMode ? '1px dashed var(--edit-border)' : 'none',
          outline: 'none',
        }}
      >
        {name}
      </div>

      {/* Chords */}
      <div
        ref={chordsRef}
        contentEditable={editMode}
        suppressContentEditableWarning
        onBlur={e => onChordsChange?.(e.currentTarget.textContent?.trim() ?? chords)}
        onFocus={() => {
          if (editMode && chordsRef.current) onChordsFocus?.(chordsRef.current)
        }}
        style={{
          fontSize,
          fontWeight: 'bold',
          letterSpacing: 1,
          wordSpacing: 14,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          outline: 'none',
          background: editMode ? 'var(--badge-bg)' : 'transparent',
          borderRadius: editMode ? 4 : 0,
          padding: editMode ? '2px 4px' : 0,
        }}
      >
        {chords}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update SongSheet to handle edit mode**

Add edit mode logic to `SongSheet.tsx` — manage section add/move/delete, wire ChordPicker and SectionPicker. The key additions:

```tsx
// Add state for chord picker and section picker
const [pickerTarget, setPickerTarget] = useState<HTMLDivElement | null>(null)
const [showSectionPicker, setShowSectionPicker] = useState(false)

// Section management handlers
const handleSectionChange = (index: number, field: 'name' | 'chords', value: string) => {
  const updated = [...sections]
  updated[index] = { ...updated[index], [field]: value }
  saveSections(currentSong.title, updated)
}

const handleMove = (index: number, direction: number) => {
  const updated = [...sections]
  const target = index + direction
  ;[updated[index], updated[target]] = [updated[target], updated[index]]
  saveSections(currentSong.title, updated)
}

const handleDelete = (index: number) => {
  if (sections.length <= 1) return
  saveSections(currentSong.title, sections.filter((_, i) => i !== index))
}

const handleAddSection = (name: string) => {
  saveSections(currentSong.title, [...sections, { name, chords: '' }])
  setShowSectionPicker(false)
}

const handleChordSelect = (chord: string) => {
  if (!pickerTarget) return
  pickerTarget.textContent = (pickerTarget.textContent || '') + '  ' + chord
}
```

Wire these into the SectionRow components and add the pickers conditionally.

- [ ] **Step 5: Test editing in browser**

Run: `cd app && npm run dev`
Expected: Edit mode toggles, sections editable, chord picker opens on focus, section picker adds sections, move/delete work, edits persist after page refresh

- [ ] **Step 6: Commit**

```bash
git add app/src/components/edit/ app/src/components/song/
git commit -m "feat: edit mode with chord picker, section picker, section management"
```

---

## Task 11: Chord Diagrams

**Files:**
- Create: `app/src/components/diagrams/ChordDiagram.tsx`
- Create: `app/src/components/diagrams/DiagramsBar.tsx`
- Create: `app/src/components/diagrams/VoicingPicker.tsx`

- [ ] **Step 1: Create ChordDiagram SVG renderer**

```tsx
import type { ChordVoicing } from '../../data/chords-db'

interface Props {
  voicing: ChordVoicing
  size?: number
}

export function ChordDiagram({ voicing, size = 120 }: Props) {
  const { f: frets, s: startFret } = voicing
  const w = size
  const h = size * 1.17
  const padding = { top: 20, left: 22, right: 10, bottom: 10 }
  const gridW = w - padding.left - padding.right
  const gridH = h - padding.top - padding.bottom
  const stringSpacing = gridW / 5
  const fretSpacing = gridH / 5

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {/* Nut or fret position */}
      {startFret === 0 ? (
        <line
          x1={padding.left} y1={padding.top}
          x2={padding.left + gridW} y2={padding.top}
          stroke="white" strokeWidth={3}
        />
      ) : (
        <text
          x={padding.left - 8} y={padding.top + fretSpacing / 2 + 4}
          fill="white" fontSize={10} textAnchor="end"
        >
          {startFret}fr
        </text>
      )}

      {/* Grid lines — frets */}
      {Array.from({ length: 6 }, (_, i) => (
        <line
          key={`fret-${i}`}
          x1={padding.left} y1={padding.top + i * fretSpacing}
          x2={padding.left + gridW} y2={padding.top + i * fretSpacing}
          stroke="#555" strokeWidth={1}
        />
      ))}

      {/* Grid lines — strings */}
      {Array.from({ length: 6 }, (_, i) => (
        <line
          key={`string-${i}`}
          x1={padding.left + i * stringSpacing} y1={padding.top}
          x2={padding.left + i * stringSpacing} y2={padding.top + gridH}
          stroke="#555" strokeWidth={1}
        />
      ))}

      {/* Finger positions, muted, open */}
      {frets.map((fret, i) => {
        const x = padding.left + i * stringSpacing
        if (fret === null) {
          return (
            <text key={i} x={x} y={padding.top - 6} fill="white" fontSize={12} textAnchor="middle">
              x
            </text>
          )
        }
        if (fret === 0) {
          return (
            <circle key={i} cx={x} cy={padding.top - 6} r={4}
              fill="none" stroke="white" strokeWidth={1.5} />
          )
        }
        return (
          <circle key={i}
            cx={x}
            cy={padding.top + (fret - 0.5) * fretSpacing}
            r={stringSpacing * 0.35}
            fill="white"
          />
        )
      })}
    </svg>
  )
}
```

- [ ] **Step 2: Create DiagramsBar**

```tsx
import { useState } from 'react'
import { useStore } from '../../store/use-store'
import { CHORD_DB } from '../../data/chords-db'
import { ChordDiagram } from './ChordDiagram'
import { VoicingPicker } from './VoicingPicker'

export function DiagramsBar() {
  const currentSong = useStore(s => s.currentSong())
  const getEditedSections = useStore(s => s.getEditedSections)
  const [selectedChord, setSelectedChord] = useState<string | null>(null)

  if (!currentSong) return null

  const sections = getEditedSections(currentSong.title)
  const uniqueChords: string[] = []
  sections.forEach(s => {
    s.chords.split(/\s+/).forEach(c => {
      if (c && !uniqueChords.includes(c)) uniqueChords.push(c)
    })
  })

  return (
    <>
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '4px 16px',
        overflowX: 'auto',
        flexShrink: 0,
        maxWidth: 700,
        width: '100%',
        margin: '0 auto',
      }}>
        {uniqueChords.map(chord => {
          const voicings = CHORD_DB[chord]
          if (!voicings?.length) return (
            <div key={chord} style={{
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--text-muted)',
              padding: '4px 8px',
            }}>
              {chord}
            </div>
          )
          return (
            <div
              key={chord}
              onClick={() => setSelectedChord(chord)}
              style={{ textAlign: 'center', cursor: 'pointer', flexShrink: 0 }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{chord}</div>
              <ChordDiagram voicing={voicings[0]} size={80} />
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{voicings[0].l}</div>
            </div>
          )
        })}
      </div>

      {selectedChord && (
        <VoicingPicker
          chord={selectedChord}
          onClose={() => setSelectedChord(null)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 3: Create VoicingPicker**

```tsx
import { useState } from 'react'
import { CHORD_DB } from '../../data/chords-db'
import { ChordDiagram } from './ChordDiagram'
import { Modal } from '../shared/Modal'

interface Props {
  chord: string
  onClose: () => void
}

export function VoicingPicker({ chord, onClose }: Props) {
  const voicings = CHORD_DB[chord] ?? []
  const [selected, setSelected] = useState(0)

  return (
    <Modal open onClose={onClose}>
      <div style={{
        background: 'var(--picker-bg)',
        borderRadius: 12,
        padding: 16,
        maxWidth: 400,
        width: '90%',
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>{chord}</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {voicings.map((v, i) => (
            <div
              key={i}
              onClick={() => setSelected(i)}
              style={{
                textAlign: 'center',
                cursor: 'pointer',
                border: i === selected ? '2px solid var(--accent)' : '2px solid transparent',
                borderRadius: 8,
                padding: 4,
              }}
            >
              <ChordDiagram voicing={v} size={110} />
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.l}</div>
            </div>
          ))}
        </div>
        {voicings.length === 0 && (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
            No diagrams available for {chord}
          </div>
        )}
      </div>
    </Modal>
  )
}
```

- [ ] **Step 4: Wire DiagramsBar into App.tsx**

Add between SongSheet and BottomBar:
```tsx
const diagramsVisible = useStore(s => s.diagramsVisible)
// ...
{diagramsVisible && <DiagramsBar />}
```

Add a "Chords" toggle button to TopBar.

- [ ] **Step 5: Test in browser**

Run: `cd app && npm run dev`
Expected: Chord diagrams strip visible below song, tapping opens voicing picker, toggle hides/shows

- [ ] **Step 6: Commit**

```bash
git add app/src/components/diagrams/ app/src/App.tsx app/src/components/layout/TopBar.tsx
git commit -m "feat: chord diagrams bar with SVG renderer and voicing picker"
```

---

## Task 12: Tap Tempo

**Files:**
- Create: `app/src/components/shared/TapTempo.tsx`

- [ ] **Step 1: Create TapTempo**

```tsx
import { useState, useRef } from 'react'
import { useStore } from '../../store/use-store'
import { Modal } from './Modal'

interface Props {
  open: boolean
  onClose: () => void
}

export function TapTempo({ open, onClose }: Props) {
  const currentSong = useStore(s => s.currentSong())
  const saveBpm = useStore(s => s.saveBpm)
  const [bpm, setBpm] = useState(currentSong?.bpm ?? 120)
  const tapsRef = useRef<number[]>([])

  const handleTap = () => {
    const now = Date.now()
    tapsRef.current.push(now)
    if (tapsRef.current.length > 8) tapsRef.current.shift()
    if (tapsRef.current.length >= 2) {
      const taps = tapsRef.current
      const intervals = taps.slice(1).map((t, i) => t - taps[i])
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const calculated = Math.round(60000 / avgInterval)
      if (calculated >= 20 && calculated <= 300) setBpm(calculated)
    }
  }

  const handleSave = () => {
    if (currentSong) saveBpm(currentSong.title, bpm)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div style={{
        background: 'var(--picker-bg)',
        borderRadius: 12,
        padding: 24,
        textAlign: 'center',
        width: '80%',
        maxWidth: 300,
      }}>
        <div style={{ fontSize: 48, fontWeight: 'bold', marginBottom: 16 }}>{bpm}</div>
        <button
          onClick={handleTap}
          style={{
            width: '100%',
            padding: 20,
            fontSize: 20,
            fontWeight: 'bold',
            background: 'var(--accent)',
            color: '#fff',
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          TAP
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: 10,
              fontSize: 16,
              borderRadius: 8,
              background: 'var(--badge-bg)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: 10,
              fontSize: 16,
              borderRadius: 8,
              background: 'var(--success)',
              color: '#000',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Wire to BPM badge in SongSheet**

Add TapTempo state and render it when BPM badge is clicked.

- [ ] **Step 3: Commit**

```bash
git add app/src/components/shared/TapTempo.tsx app/src/components/song/SongSheet.tsx
git commit -m "feat: tap tempo modal"
```

---

## Task 13: Import Flow

**Files:**
- Create: `app/src/components/import/ImportModal.tsx`
- Create: `app/src/components/import/ProgressView.tsx`
- Create: `app/src/components/import/ResultsView.tsx`

- [ ] **Step 1: Create ProgressView**

```tsx
interface Props {
  steps: { label: string; status: 'pending' | 'active' | 'done' }[]
}

export function ProgressView({ steps }: Props) {
  return (
    <div style={{ padding: 16 }}>
      {steps.map((step, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
          <span style={{ fontSize: 16 }}>
            {step.status === 'done' ? '\u2713' : step.status === 'active' ? '\u25CF' : '\u25CB'}
          </span>
          <span style={{
            color: step.status === 'pending' ? 'var(--text-muted)' : 'var(--text)',
            fontWeight: step.status === 'active' ? 600 : 400,
          }}>
            {step.label}
          </span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create ResultsView**

```tsx
import { useState } from 'react'
import type { Section } from '../../types'

interface AnalysisResult {
  title: string
  artist: string
  key: string
  bpm: number
  timeSignature: string
  sections: Section[]
  confidence: number
  source: string
  canRefine: boolean
  jobId?: string
}

interface Props {
  result: AnalysisResult
  onSave: (result: AnalysisResult) => void
  onRefine?: () => void
  refining?: boolean
}

export function ResultsView({ result, onSave, onRefine, refining }: Props) {
  const [title, setTitle] = useState(result.title)
  const [artist, setArtist] = useState(result.artist)
  const [capo, setCapo] = useState<number | null>(null)

  const confidenceColor = result.confidence >= 80 ? 'var(--success)'
    : result.confidence >= 60 ? '#facc15' : 'var(--danger)'

  return (
    <div style={{ padding: 16, overflow: 'auto', flex: 1 }}>
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        style={{ fontSize: 20, fontWeight: 'bold', width: '100%', marginBottom: 8 }}
      />
      <input
        value={artist}
        onChange={e => setArtist(e.target.value)}
        style={{ fontSize: 16, width: '100%', marginBottom: 12 }}
      />

      {/* Confidence */}
      <div style={{
        padding: '8px 12px',
        borderRadius: 8,
        background: confidenceColor + '20',
        color: confidenceColor,
        fontSize: 14,
        fontWeight: 600,
        marginBottom: 12,
      }}>
        {result.source === 'music-ai' ? 'Analyzed with Music AI' : `Local detection: ${result.confidence}% confident`}
      </div>

      {/* Refine button */}
      {result.canRefine && onRefine && (
        <button
          onClick={onRefine}
          disabled={refining}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            background: '#8b5cf6',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 12,
            opacity: refining ? 0.6 : 1,
          }}
        >
          {refining ? 'Refining...' : 'Refine with Music AI'}
        </button>
      )}

      {/* Meta */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ background: 'var(--badge-bg)', padding: '4px 10px', borderRadius: 12, fontSize: 13 }}>
          Key: {result.key}
        </span>
        <span style={{ background: 'var(--badge-bg)', padding: '4px 10px', borderRadius: 12, fontSize: 13 }}>
          {result.bpm} BPM
        </span>
        <span style={{ background: 'var(--badge-bg)', padding: '4px 10px', borderRadius: 12, fontSize: 13 }}>
          {result.timeSignature}
        </span>
        <select
          value={capo ?? ''}
          onChange={e => setCapo(e.target.value ? parseInt(e.target.value) : null)}
          style={{ fontSize: 13, padding: '4px 8px', borderRadius: 12, background: 'var(--badge-bg)', border: 'none', color: 'var(--text)' }}
        >
          <option value="">No Capo</option>
          {Array.from({ length: 9 }, (_, i) => (
            <option key={i + 1} value={i + 1}>Capo {i + 1}</option>
          ))}
        </select>
      </div>

      {/* Sections preview */}
      {result.sections.map((s, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            {s.name}
          </div>
          <div style={{ fontSize: 16, fontWeight: 'bold' }}>{s.chords}</div>
        </div>
      ))}

      {/* Save */}
      <button
        onClick={() => onSave({ ...result, title, artist })}
        style={{
          width: '100%',
          padding: 14,
          borderRadius: 8,
          background: 'var(--success)',
          color: '#000',
          fontSize: 16,
          fontWeight: 'bold',
          marginTop: 16,
        }}
      >
        Save Song
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Create ImportModal**

This is the main orchestrator — handles URL/search/upload tabs, server detection, SSE streaming, and wires ProgressView and ResultsView. Port the logic from the existing `index.html` (lines 1742-2160), adapting to React patterns. Key aspects:

- Three tab buttons: URL, Search, Upload
- `detectServer()` tries localhost:3000 then api.stratlab.uk
- SSE streaming via `parseSSEStream()` for progress updates
- Save calls `useStore.getState().addCustomSong()`

This file will be ~250 lines. Port the exact server communication logic from the existing app. The SSE parsing, server detection, and API calls remain the same — only the DOM manipulation changes to React state.

- [ ] **Step 4: Wire ImportModal to TopBar**

Add `+` import button to TopBar, manage `showImport` state.

- [ ] **Step 5: Test import flow in browser**

Run server: `cd server && npm run dev`
Run app: `cd app && npm run dev`
Expected: Import modal opens, search works, analysis streams progress, results editable, save adds to setlist

- [ ] **Step 6: Commit**

```bash
git add app/src/components/import/
git commit -m "feat: import flow with SSE progress, server detection, results editor"
```

---

## Task 14: Wake Lock and Service Worker

**Files:**
- Create: `app/src/hooks/use-wake-lock.ts`
- Create: `app/src/sw.ts`
- Modify: `app/vite.config.ts`

- [ ] **Step 1: Create wake lock hook**

```ts
import { useEffect, useRef } from 'react'

export function useWakeLock(enabled: boolean) {
  const wakeLock = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return

    const request = async () => {
      try {
        wakeLock.current = await navigator.wakeLock.request('screen')
      } catch {
        // Wake lock request failed — ignore
      }
    }

    request()

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') request()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      wakeLock.current?.release()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled])
}
```

- [ ] **Step 2: Add wake lock to App.tsx**

```tsx
import { useWakeLock } from './hooks/use-wake-lock'

// Inside App component:
const viewMode = useStore(s => s.viewMode)
useWakeLock(viewMode === 'stage')
```

- [ ] **Step 3: Install vite-plugin-pwa**

Run: `cd app && npm install -D vite-plugin-pwa`

- [ ] **Step 4: Update vite.config.ts for PWA**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'PlayBook',
        short_name: 'PlayBook',
        start_url: './',
        display: 'standalone',
        background_color: '#1a1a1a',
        theme_color: '#1a1a1a',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/api\./,
          handler: 'NetworkFirst',
        }],
      },
    }),
  ],
  base: '/gm-setlist/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
  },
})
```

- [ ] **Step 5: Commit**

```bash
git add app/src/hooks/use-wake-lock.ts app/vite.config.ts app/src/App.tsx app/package.json app/package-lock.json
git commit -m "feat: wake lock for stage mode, PWA service worker via vite-plugin-pwa"
```

---

## Task 15: Build and Deploy to GitHub Pages

**Files:**
- Modify: `app/vite.config.ts` (already done)
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Verify build works**

Run: `cd app && npm run build`
Expected: Build succeeds, output in `/dist/`

- [ ] **Step 2: Create GitHub Actions deploy workflow**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: app/package-lock.json
      - run: cd app && npm ci
      - run: cd app && npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Run tests before pushing**

Run: `cd app && npm test`
Expected: All tests pass

- [ ] **Step 4: Commit and push**

```bash
git add .github/ app/ dist/
git commit -m "feat: GitHub Actions deploy, production build"
git push origin main
```

- [ ] **Step 5: Verify deployment**

Check: `https://yanlukan.github.io/gm-setlist/`
Expected: App loads, songs display, setlist drag-and-drop works, edits persist across refresh, works on iPad

---

## Task 16: Migration — Import localStorage Data

**Files:**
- Create: `app/src/store/migrate.ts`

- [ ] **Step 1: Create migration utility**

For existing users, migrate their localStorage data to IndexedDB on first load:

```ts
import type { Song, SongEdits, SetlistData } from '../types'
import * as persistence from './persistence'
import { DEFAULT_SONGS } from '../data/songs'

export async function migrateFromLocalStorage(): Promise<boolean> {
  // Check if already migrated
  const migrated = localStorage.getItem('playbook-migrated-to-idb')
  if (migrated) return false

  // Migrate custom songs
  const customRaw = localStorage.getItem('cheatsheet-songs-custom')
  if (customRaw) {
    const customSongs: Song[] = JSON.parse(customRaw)
    await persistence.saveCustomSongs(customSongs)
  }

  // Migrate setlist data
  const setlistRaw = localStorage.getItem('cheatsheet-setlists')
  if (setlistRaw) {
    const data: SetlistData = JSON.parse(setlistRaw)
    await persistence.saveSetlistData(data)
  }

  // Migrate per-song edits
  const allSongs = [...DEFAULT_SONGS, ...(customRaw ? JSON.parse(customRaw) : [])]
  for (const song of allSongs) {
    const edits: SongEdits = {}
    const sections = localStorage.getItem('cheatsheet-sections-' + song.title)
    if (sections) edits.sections = JSON.parse(sections)
    const notes = localStorage.getItem('cheatsheet-notes-' + song.title)
    if (notes) edits.notes = notes
    const key = localStorage.getItem('cheatsheet-key-' + song.title)
    if (key) edits.key = key
    const bpm = localStorage.getItem('cheatsheet-bpm-' + song.title)
    if (bpm) edits.bpm = parseInt(bpm)

    if (Object.keys(edits).length > 0) {
      await persistence.saveSongEdits(song.title, edits)
    }
  }

  // Migrate theme
  const theme = localStorage.getItem('cheatsheet-theme')
  if (theme === 'light' || theme === 'dark') {
    await persistence.saveTheme(theme)
  }

  localStorage.setItem('playbook-migrated-to-idb', '1')
  return true
}
```

- [ ] **Step 2: Call migration before hydration in App.tsx**

```tsx
useEffect(() => {
  async function init() {
    await migrateFromLocalStorage()
    await hydrate()
  }
  init()
}, [hydrate])
```

- [ ] **Step 3: Commit**

```bash
git add app/src/store/migrate.ts app/src/App.tsx
git commit -m "feat: localStorage to IndexedDB migration for existing users"
```
