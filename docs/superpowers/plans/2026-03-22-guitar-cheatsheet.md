# Guitar Cheatsheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-file web app (index.html + songs.js) that displays a guitar cheatsheet for a 16-song George Michael tribute setlist, optimized for iPad Air 11" portrait.

**Architecture:** `songs.js` exports a `SONGS` array of song objects. `index.html` contains all HTML structure, CSS styling, and JS logic. The app reads `SONGS` on load, renders the current song, and handles transpose/edit/navigation/theme features entirely client-side. Edits persist in `localStorage`.

**Tech Stack:** Vanilla HTML, CSS, JavaScript. No dependencies, no build tools. Opens directly in Safari from the Files app.

**Spec:** `docs/superpowers/specs/2026-03-22-guitar-cheatsheet-design.md`

---

## File Structure

```
songs.js      — SONGS array with all 16 songs (data only, the file users edit)
index.html    — complete app: HTML structure, <style> block, <script> block
```

`index.html` JS is organized into these logical sections (all inside one `<script>` tag):
- **State** — `currentIndex`, `transposeShift`, `editMode`, `theme`
- **Transpose engine** — `parseChord()`, `transposeChord()`, `transposeChords()`
- **Renderer** — `renderSong()`, `renderBottomBar()`, `autoScaleFont()`
- **Edit mode** — `enterEditMode()`, `exitEditMode()`, `saveEdits()`, `resetEdits()`
- **Navigation** — swipe handler, song-list tap handler
- **Init** — load theme from localStorage, render first song

---

### Task 1: Create songs.js with all 16 songs

**Files:**
- Create: `songs.js`

This is the largest task — researching and entering accurate chord data for all 16 songs.

- [ ] **Step 1: Create songs.js with the SONGS array containing all 16 songs**

The file must declare a global `SONGS` array:
```js
const SONGS = [
  {
    title: "Song Name",
    artist: "George Michael",  // or "Wham!"
    key: "C",
    bpm: 120,
    timeSignature: "4/4",
    capo: null,
    notes: "",
    sections: [
      { name: "Intro", chords: "Am  G  F" },
      { name: "Verse", chords: "Am  G  F  E7" },
      // ...
    ]
  },
  // ... more songs
];
```

The full song list with accurate chord data:

1. **Faith** — Key: C, BPM: 148, 4/4. Artist: George Michael.
   - Intro (organ): C
   - Verse: C
   - Pre-Chorus: F  C  F  C  Dm  G
   - Chorus: C  F  C
   - Bridge: F  C  Dm  Bb  C
   - Outro: C  F  C  G  C

2. **I'm Your Man** — Key: Bb, BPM: 118, 4/4. Artist: George Michael.
   - Intro: Bb  Eb  F
   - Verse: Bb  Eb  F  Bb
   - Chorus: Eb  F  Bb  Gm  Eb  F
   - Bridge: Gm  Eb  Cm  F

3. **Fastlove** — Key: Ab, BPM: 112, 4/4. Artist: George Michael.
   - Intro: Fm7  Bbm7  Eb  Ab
   - Verse: Fm7  Bbm7  Eb  Ab
   - Chorus: Db  Eb  Fm  Db  Eb  Ab
   - Bridge: Db  Eb  Cm  Fm

4. **Wake Me Up Before You Go-Go** — Key: C, BPM: 158, 4/4. Artist: Wham!
   - Intro: C
   - Verse: C  Dm  Em  F  G
   - Chorus: C  Em  F  G  C
   - Bridge: Am  F  Dm  G

5. **Amazing** — Key: D, BPM: 80, 4/4. Artist: George Michael.
   - Intro: D  G  A
   - Verse: D  Bm  G  A
   - Chorus: D  G  A  Bm  G  A
   - Bridge: Em  G  A

6. **Outside** — Key: C, BPM: 120, 4/4. Artist: George Michael.
   - Intro: Am  F  C  G
   - Verse: Am  F  C  G
   - Chorus: F  G  Am  F  G  C
   - Bridge: Dm  Am  F  G

7. **Papa Was a Rolling Stone** — Key: Bm, BPM: 105, 4/4. Artist: The Temptations (covered).
   - Groove: Bm7
   - Verse: Bm7  Em7
   - Chorus: Bm7  Em7  F#7
   - Notes: "Originally Bbm — transposed to Bm for guitar. Mostly one-chord groove on Bm7 — stay in the pocket"

8. **Father Figure** — Key: D, BPM: 72, 4/4. Artist: George Michael.
   - Intro: Bm  G  D  A
   - Verse: Bm  G  D  A
   - Pre-Chorus: Em  G  A
   - Chorus: D  Bm  G  A  D
   - Bridge: Em  F#m  G  A

9. **Freedom! '90** — Key: C, BPM: 124, 4/4. Artist: George Michael.
   - Intro: C  G  Am  F
   - Verse: C  G  Am  F
   - Chorus: F  C  G  Am  F  C  G
   - Bridge: Dm  Am  G

10. **Jesus to a Child** — Key: C, BPM: 72, 4/4. Artist: George Michael.
    - Intro: Cmaj7  Am7  Fmaj7  G
    - Verse: Cmaj7  Am7  Fmaj7  G
    - Chorus: Am  Dm  G  C  F  Dm  G
    - Bridge: Em  Am  Dm  G

11. **A Different Corner** — Key: Bb, BPM: 72, 4/4. Artist: George Michael.
    - Intro: Bb  Eb  F
    - Verse: Bb  Gm  Eb  F
    - Chorus: Bb  Eb  Cm  F  Bb
    - Bridge: Gm  Cm  Eb  F

12. **Too Funky** — Key: Am, BPM: 115, 4/4. Artist: George Michael.
    - Intro: Am  Dm  E7
    - Verse: Am  Dm  E7  Am
    - Chorus: F  G  Am  Dm  E7
    - Bridge: Dm  Am  E7

13. **Everything She Wants** — Key: Dm, BPM: 112, 4/4. Artist: Wham!
    - Intro: Dm  Am  Bb  C
    - Verse: Dm  Am  Bb  C
    - Chorus: Gm  Bb  C  Dm
    - Bridge: Gm  Am  Bb  C  Dm

14. **Club Tropicana** — Key: F, BPM: 116, 4/4. Artist: Wham!
    - Intro: F  Bb  C
    - Verse: F  Bb  C  Dm
    - Chorus: F  Bb  C  F
    - Bridge: Gm  Am  Bb  C

15. **Somebody to Love** — Key: Ab, BPM: 76, 4/4. Artist: Queen (covered).
    - Intro: Ab  Eb  Fm  Db
    - Verse: Ab  Eb  Fm  Db  Ab  Eb
    - Chorus: Db  Ab  Eb  Fm  Db  Ab  Eb  Ab
    - Bridge: Bbm  Fm  Db  Eb

16. **Careless Whisper** (Encore) — Key: Dm, BPM: 76, 4/4. Artist: George Michael.
    - Intro: Dm  Gm7  Bbmaj7  Am7
    - Verse: Dm  Gm7  Bbmaj7  Am7
    - Chorus: Bb  Am7  Dm  Gm7  Am7
    - Bridge: Gm7  Am7  Bbmaj7  Am7  Dm
    - Notes: "Iconic sax riff on intro — follow the melody line"

- [ ] **Step 2: Verify songs.js loads without errors**

Open browser console and run:
```
// In a temporary test HTML file or browser console after loading songs.js
console.log(SONGS.length); // should be 16
SONGS.forEach(s => console.log(s.title, s.sections.length));
```

- [ ] **Step 3: Commit**

```bash
git add songs.js
git commit -m "feat: add songs.js with 16-song George Michael setlist"
```

---

### Task 2: Create index.html with HTML structure and CSS

**Files:**
- Create: `index.html`

Build the static shell — all HTML elements and complete CSS styling. No JS yet.

- [ ] **Step 1: Create index.html with the full HTML structure**

The HTML structure:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>GM Setlist</title>
  <!-- CSS goes here in a <style> tag -->
</head>
<body>
  <!-- Top bar -->
  <header id="top-bar">
    <div id="title-row">
      <h1 id="song-title"></h1>
      <div id="controls">
        <button id="edit-btn">Edit</button>
        <button id="theme-btn">☀️</button>
      </div>
    </div>
    <div id="meta-row">
      <span class="badge" id="badge-key"></span>
      <span class="badge" id="badge-bpm"></span>
      <span class="badge" id="badge-time"></span>
      <span class="badge" id="badge-capo"></span>
      <div id="transpose-controls">
        <button id="transpose-down">−</button>
        <span id="transpose-display">0</span>
        <button id="transpose-up">+</button>
      </div>
    </div>
  </header>

  <!-- Main chord display -->
  <main id="chord-area">
    <!-- Dynamically filled with section rows -->
  </main>

  <!-- Notes area (shown only when notes exist) -->
  <div id="notes-area"></div>

  <!-- Bottom navigation -->
  <footer id="bottom-bar">
    <div id="song-position"></div>
    <nav id="song-list">
      <!-- Dynamically filled with song buttons -->
    </nav>
  </footer>

  <script src="songs.js"></script>
  <!-- App JS goes here in a <script> tag -->
</body>
</html>
```

- [ ] **Step 2: Add complete CSS styling**

The `<style>` block must include:

**CSS custom properties for theming:**
```css
:root {
  --bg: #1a1a1a;
  --text: #ffffff;
  --text-muted: #888888;
  --badge-bg: #333333;
  --section-verse: #4a9eff;
  --section-chorus: #4ade80;
  --section-bridge: #fb923c;
  --section-prechorus: #c084fc;
  --section-intro: #888888;
  --section-default: #888888;
  --edit-border: #f59e0b;
}
body.light {
  --bg: #ffffff;
  --text: #1a1a1a;
  --text-muted: #666666;
  --badge-bg: #e5e7eb;
  --edit-border: #d97706;
}
```

**Layout (full viewport, no scroll):**
```css
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { height: 100%; overflow: hidden; }
body {
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg);
  color: var(--text);
  display: flex;
  flex-direction: column;
}
```

**Top bar, main area, notes, bottom bar, section colors, and edit mode:**
```css
#top-bar { padding: 12px 16px; }
#title-row { display: flex; justify-content: space-between; align-items: center; }
#song-title { font-size: 20px; font-weight: bold; }
#controls { display: flex; gap: 8px; }
#controls button { min-width: 44px; min-height: 44px; font-size: 16px;
  background: var(--badge-bg); color: var(--text); border: none; border-radius: 8px; cursor: pointer; }
#meta-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.badge { background: var(--badge-bg); padding: 4px 10px; border-radius: 12px; font-size: 13px; }
#transpose-controls { display: flex; align-items: center; gap: 4px; margin-left: auto; }
#transpose-controls button { min-width: 44px; min-height: 44px; font-size: 20px;
  background: var(--badge-bg); color: var(--text); border: none; border-radius: 8px; cursor: pointer; }
#transpose-display { min-width: 32px; text-align: center; font-size: 14px; }

#chord-area { flex: 1; padding: 12px 16px; display: flex; flex-direction: column;
  justify-content: center; gap: 4px; overflow: hidden; }
.section-row { display: flex; align-items: baseline; gap: 12px; }
.section-label { min-width: 80px; font-size: 13px; font-weight: 600; text-transform: uppercase; }
.section-chords { flex: 1; font-size: 24px; font-weight: bold; }

/* Section color coding */
.section-verse { color: var(--section-verse); }
.section-chorus { color: var(--section-chorus); }
.section-bridge { color: var(--section-bridge); }
.section-prechorus { color: var(--section-prechorus); }
.section-intro { color: var(--section-intro); }
.section-default { color: var(--section-default); }

#notes-area { padding: 4px 16px; font-size: 13px; color: var(--text-muted); font-style: italic;
  display: none; }

#bottom-bar { padding: 8px 16px; display: flex; align-items: center; gap: 12px;
  border-top: 1px solid var(--badge-bg); min-height: 56px; }
#song-position { font-size: 13px; color: var(--text-muted); white-space: nowrap; }
#song-list { display: flex; gap: 6px; overflow-x: auto; flex: 1;
  -webkit-overflow-scrolling: touch; }
.song-btn { white-space: nowrap; padding: 8px 12px; border: none; border-radius: 8px;
  background: var(--badge-bg); color: var(--text-muted); font-size: 13px; cursor: pointer;
  min-height: 44px; }
.song-btn.active { background: #4a9eff; color: #fff; }

/* Edit mode */
body.editing #chord-area { border: 2px solid var(--edit-border); border-radius: 8px; }
.section-chords.editable { background: var(--badge-bg); border-radius: 4px; padding: 2px 6px;
  outline: none; }
#reset-btn { background: #ef4444 !important; color: #fff !important; }
```

All tap targets minimum 44px. The chord area fills remaining vertical space between top bar and bottom bar via `flex: 1`.

- [ ] **Step 3: Open index.html in browser — verify the shell renders (dark background, empty structure, no errors)**

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add index.html with HTML structure and CSS styling"
```

---

### Task 3: Core rendering — display a song

**Files:**
- Modify: `index.html` (add JS inside `<script>` tag)

Wire up the JS to read `SONGS` and render the current song.

- [ ] **Step 1: Add app state and renderSong() function**

```js
// ===== STATE =====
let currentIndex = 0;
let transposeShift = 0;
let editMode = false;

// ===== STUBS (replaced by real implementations in later tasks) =====
function updateKeyBadge(song) {}
function exitEditMode() {}
function applyTranspose() {}

// ===== RENDER =====
function renderSong() {
  const song = SONGS[currentIndex];
  const edits = JSON.parse(localStorage.getItem(`cheatsheet-edits-${song.title}`) || 'null');

  // Title
  document.getElementById('song-title').textContent = song.title;

  // Badges
  document.getElementById('badge-key').textContent = `Key: ${song.key}`;
  document.getElementById('badge-bpm').textContent = `${song.bpm} BPM`;
  document.getElementById('badge-time').textContent = song.timeSignature;
  const capoBadge = document.getElementById('badge-capo');
  if (song.capo) {
    capoBadge.textContent = `Capo ${song.capo}`;
    capoBadge.style.display = '';
  } else {
    capoBadge.style.display = 'none';
  }

  // Transpose display
  transposeShift = 0;
  document.getElementById('transpose-display').textContent = '0';
  updateKeyBadge(song);

  // Sections
  const chordArea = document.getElementById('chord-area');
  chordArea.innerHTML = '';
  song.sections.forEach((section, i) => {
    const row = document.createElement('div');
    row.className = 'section-row';

    const label = document.createElement('span');
    label.className = `section-label section-${sectionType(section.name)}`;
    label.textContent = section.name;

    const chords = document.createElement('span');
    chords.className = 'section-chords';
    const chordStr = edits ? (edits[i] || section.chords) : section.chords;
    chords.textContent = chordStr;

    row.appendChild(label);
    row.appendChild(chords);
    chordArea.appendChild(row);
  });

  // Notes
  const notesArea = document.getElementById('notes-area');
  if (song.notes) {
    notesArea.textContent = song.notes;
    notesArea.style.display = '';
  } else {
    notesArea.style.display = 'none';
  }

  // Auto-scale font
  autoScaleFont();

  // Update bottom bar
  renderBottomBar();
}

function sectionType(name) {
  const n = name.toLowerCase();
  if (n.includes('verse')) return 'verse';
  if (n.includes('chorus')) return 'chorus';
  if (n.includes('bridge')) return 'bridge';
  if (n.includes('pre-chorus') || n.includes('prechorus')) return 'prechorus';
  if (n.includes('intro') || n.includes('outro')) return 'intro';
  return 'default';
}
```

- [ ] **Step 2: Add autoScaleFont() function**

```js
function autoScaleFont() {
  const chordArea = document.getElementById('chord-area');
  const rows = chordArea.querySelectorAll('.section-chords');
  // Start at 28px, shrink until content fits, minimum 16px
  let fontSize = 28;
  rows.forEach(r => r.style.fontSize = fontSize + 'px');

  while (chordArea.scrollHeight > chordArea.clientHeight && fontSize > 16) {
    fontSize -= 1;
    rows.forEach(r => r.style.fontSize = fontSize + 'px');
  }
}
```

- [ ] **Step 3: Add renderBottomBar() function**

```js
function renderBottomBar() {
  document.getElementById('song-position').textContent =
    `${currentIndex + 1} / ${SONGS.length}`;

  const nav = document.getElementById('song-list');
  nav.innerHTML = '';
  SONGS.forEach((song, i) => {
    const btn = document.createElement('button');
    btn.className = 'song-btn' + (i === currentIndex ? ' active' : '');
    btn.textContent = song.title;
    btn.addEventListener('click', () => {
      currentIndex = i;
      exitEditMode();
      renderSong();
    });
    nav.appendChild(btn);
  });

  // Auto-scroll to center current song
  const activeBtn = nav.querySelector('.song-btn.active');
  if (activeBtn) {
    activeBtn.scrollIntoView({ inline: 'center', behavior: 'smooth' });
  }
}
```

- [ ] **Step 4: Add init code at the bottom of the script**

```js
// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // Load theme
  const savedTheme = localStorage.getItem('cheatsheet-theme');
  if (savedTheme === 'light') document.body.classList.add('light');
  renderSong();
});
```

- [ ] **Step 5: Open index.html in browser — verify Faith displays with all sections, badges, and bottom bar**

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: core song rendering with auto-scale and bottom bar"
```

---

### Task 4: Transpose engine

**Files:**
- Modify: `index.html` (add transpose functions to `<script>`)

- [ ] **Step 1: Add chord parsing and transpose functions**

```js
// ===== TRANSPOSE =====
const SHARPS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLATS  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const FLAT_KEYS = ['F','Bb','Eb','Ab','Db','Gb','Dm','Gm','Cm','Fm','Bbm','Ebm'];

function parseChord(chord) {
  // Returns { root, quality } or null
  const match = chord.match(/^([A-G][#b]?)(.*)/);
  if (!match) return null;
  return { root: match[1], quality: match[2] };
}

function noteIndex(note) {
  let idx = SHARPS.indexOf(note);
  if (idx === -1) idx = FLATS.indexOf(note);
  return idx;
}

function transposeNote(note, semitones, useFlats) {
  const idx = noteIndex(note);
  if (idx === -1) return note;
  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  return useFlats ? FLATS[newIdx] : SHARPS[newIdx];
}

function shouldUseFlats(originalKey, semitones) {
  // Determine if the target key is a flat key
  const parsed = parseChord(originalKey);
  if (!parsed) return false;
  const targetIdx = ((noteIndex(parsed.root) + semitones) % 12 + 12) % 12;
  const targetNote = SHARPS[targetIdx];
  const targetKey = targetNote + parsed.quality;
  // Check both the note and the full key against flat keys
  return FLAT_KEYS.includes(targetKey) || FLAT_KEYS.includes(targetNote);
}

function transposeChord(chord, semitones, useFlats) {
  if (semitones === 0) return chord;
  // Handle slash chords: Am/G
  if (chord.includes('/')) {
    const [main, bass] = chord.split('/');
    return transposeChord(main, semitones, useFlats) + '/' +
           transposeChord(bass, semitones, useFlats);
  }
  const parsed = parseChord(chord);
  if (!parsed) return chord;
  return transposeNote(parsed.root, semitones, useFlats) + parsed.quality;
}

function transposeChords(chordsStr, semitones, songKey) {
  if (semitones === 0) return chordsStr;
  const useFlats = shouldUseFlats(songKey, semitones);
  return chordsStr.split(/\s+/).map(c => transposeChord(c, semitones, useFlats)).join('  ');
}
```

- [ ] **Step 2: Add updateKeyBadge() function**

```js
function updateKeyBadge(song) {
  const badge = document.getElementById('badge-key');
  if (transposeShift === 0) {
    badge.textContent = `Key: ${song.key}`;
  } else {
    const useFlats = shouldUseFlats(song.key, transposeShift);
    const transposedKey = transposeChord(song.key, transposeShift, useFlats);
    const sign = transposeShift > 0 ? '+' : '';
    badge.textContent = `Key: ${song.key} (${sign}${transposeShift} → ${transposedKey})`;
  }
}
```

- [ ] **Step 3: Add applyTranspose() at module level (replaces the stub from Task 3)**

```js
// Replace the stub: function applyTranspose() {}
function applyTranspose() {
  const song = SONGS[currentIndex];
  const edits = JSON.parse(localStorage.getItem(`cheatsheet-edits-${song.title}`) || 'null');
  document.getElementById('transpose-display').textContent =
    transposeShift === 0 ? '0' : (transposeShift > 6 ? `${transposeShift - 12}` : `+${transposeShift}`);
  updateKeyBadge(song);

  const chordEls = document.querySelectorAll('.section-chords');
  song.sections.forEach((section, i) => {
    const chordStr = edits ? (edits[i] || section.chords) : section.chords;
    chordEls[i].textContent = transposeChords(chordStr, transposeShift, song.key);
  });
}
```

- [ ] **Step 4: Wire transpose buttons**

Add to the `DOMContentLoaded` event listener:
```js
document.getElementById('transpose-up').addEventListener('click', () => {
  if (editMode) return;
  transposeShift = ((transposeShift + 1) % 12 + 12) % 12;
  applyTranspose();
});
document.getElementById('transpose-down').addEventListener('click', () => {
  if (editMode) return;
  transposeShift = ((transposeShift - 1) % 12 + 12) % 12;
  applyTranspose();
});
```

- [ ] **Step 5: Open in browser — test transpose +1 on Faith (C should become C#), test -1 (should become B). Test a flat key song.**

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: transpose engine with sharp/flat key detection"
```

---

### Task 5: Swipe navigation

**Files:**
- Modify: `index.html` (add swipe handler to `<script>`)

- [ ] **Step 1: Add touch swipe handler**

```js
// ===== SWIPE NAVIGATION =====
let touchStartX = 0;
let touchStartY = 0;

document.getElementById('chord-area').addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

document.getElementById('chord-area').addEventListener('touchend', (e) => {
  if (editMode) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  // Only trigger if horizontal swipe > 50px and more horizontal than vertical
  if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;

  if (dx < 0 && currentIndex < SONGS.length - 1) {
    // Swipe left — next song
    currentIndex++;
    renderSong();
  } else if (dx > 0 && currentIndex > 0) {
    // Swipe right — previous song
    currentIndex--;
    renderSong();
  } else {
    // Edge bounce — brief visual feedback
    const area = document.getElementById('chord-area');
    area.style.transition = 'transform 0.15s';
    area.style.transform = dx < 0 ? 'translateX(-20px)' : 'translateX(20px)';
    setTimeout(() => {
      area.style.transform = '';
      setTimeout(() => area.style.transition = '', 150);
    }, 150);
  }
}, { passive: true });
```

- [ ] **Step 2: Open in browser (or use touch simulation in DevTools) — swipe left/right between songs, verify edge bounce at song 1 and song 16**

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: swipe navigation with edge bounce"
```

---

### Task 6: Edit mode with localStorage

**Files:**
- Modify: `index.html` (add edit mode functions to `<script>`)

- [ ] **Step 1: Add edit mode functions**

```js
// ===== EDIT MODE =====
function enterEditMode() {
  editMode = true;
  document.body.classList.add('editing');
  document.getElementById('edit-btn').textContent = 'Done';

  // Show reset button
  let resetBtn = document.getElementById('reset-btn');
  if (!resetBtn) {
    resetBtn = document.createElement('button');
    resetBtn.id = 'reset-btn';
    resetBtn.textContent = 'Reset';
    resetBtn.addEventListener('click', resetEdits);
    document.getElementById('controls').appendChild(resetBtn);
  }
  resetBtn.style.display = '';

  // Revert to untransposed chords for editing
  const song = SONGS[currentIndex];
  const edits = JSON.parse(localStorage.getItem(`cheatsheet-edits-${song.title}`) || 'null');
  const chordEls = document.querySelectorAll('.section-chords');

  chordEls.forEach((el, i) => {
    const chordStr = edits ? (edits[i] || song.sections[i].chords) : song.sections[i].chords;
    el.textContent = chordStr;
    el.contentEditable = true;
    el.classList.add('editable');
  });
}

function exitEditMode() {
  if (!editMode) return;
  editMode = false;
  document.body.classList.remove('editing');
  document.getElementById('edit-btn').textContent = 'Edit';
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) resetBtn.style.display = 'none';

  // Save any changes
  saveEdits();

  // Remove contentEditable
  document.querySelectorAll('.section-chords').forEach(el => {
    el.contentEditable = false;
    el.classList.remove('editable');
  });

  // Re-apply transpose
  applyTranspose();
}

function saveEdits() {
  const song = SONGS[currentIndex];
  const chordEls = document.querySelectorAll('.section-chords');
  const edits = {};
  let hasChanges = false;

  chordEls.forEach((el, i) => {
    const current = el.textContent.trim();
    if (current !== song.sections[i].chords) {
      edits[i] = current;
      hasChanges = true;
    }
  });

  if (hasChanges) {
    localStorage.setItem(`cheatsheet-edits-${song.title}`, JSON.stringify(edits));
  } else {
    localStorage.removeItem(`cheatsheet-edits-${song.title}`);
  }
}

function resetEdits() {
  const song = SONGS[currentIndex];
  localStorage.removeItem(`cheatsheet-edits-${song.title}`);
  exitEditMode();
  renderSong();
}
```

- [ ] **Step 2: Wire the Edit button**

Add to the `DOMContentLoaded` event listener:
```js
document.getElementById('edit-btn').addEventListener('click', () => {
  if (editMode) {
    exitEditMode();
  } else {
    enterEditMode();
  }
});
```

- [ ] **Step 3: Open in browser — tap Edit, modify a chord, tap Done. Navigate away and back — verify the edit persisted. Tap Edit then Reset — verify it reverts.**

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: edit mode with localStorage persistence and per-song reset"
```

---

### Task 7: Dark/light mode toggle

**Files:**
- Modify: `index.html` (add theme toggle to `<script>`)

- [ ] **Step 1: Wire the theme toggle button**

Add to the `DOMContentLoaded` event listener:
```js
// Theme toggle
const themeBtn = document.getElementById('theme-btn');
function updateThemeBtn() {
  themeBtn.textContent = document.body.classList.contains('light') ? '🌙' : '☀️';
}
updateThemeBtn();

themeBtn.addEventListener('click', () => {
  document.body.classList.toggle('light');
  localStorage.setItem('cheatsheet-theme',
    document.body.classList.contains('light') ? 'light' : 'dark');
  updateThemeBtn();
});
```

- [ ] **Step 2: Open in browser — toggle between dark and light modes. Reload — verify the preference persists.**

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: dark/light mode toggle with persistence"
```

---

### Task 8: Final polish and manual testing

**Files:**
- Modify: `index.html` (CSS tweaks)
- Modify: `songs.js` (fix any chord errors found during testing)

- [ ] **Step 1: Test all 16 songs render within one screen — verify auto-scaling kicks in for songs with many sections**

- [ ] **Step 2: Test transpose on songs with flat keys (Fastlove in Ab, A Different Corner in Bb) — verify flats display correctly**

- [ ] **Step 3: Test edit mode — edit a chord, navigate away, come back, verify persistence. Reset and verify revert.**

- [ ] **Step 4: Test swipe navigation through all 16 songs — verify edge bounce at boundaries**

- [ ] **Step 5: Test bottom bar — tap songs to jump, verify auto-scroll centering**

- [ ] **Step 6: Test dark/light mode in both modes — verify readability**

- [ ] **Step 7: Fix any issues found, commit**

```bash
git add -A
git commit -m "fix: polish and adjustments from manual testing"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Song data for all 16 songs | `songs.js` |
| 2 | HTML structure + CSS styling | `index.html` |
| 3 | Core rendering (display song, auto-scale, bottom bar) | `index.html` |
| 4 | Transpose engine | `index.html` |
| 5 | Swipe navigation | `index.html` |
| 6 | Edit mode with localStorage | `index.html` |
| 7 | Dark/light mode toggle | `index.html` |
| 8 | Final polish and manual testing | both |
