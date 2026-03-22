# Guitar Cheatsheet — George Michael Tribute Band

## Overview

A two-file web app (`index.html` + `songs.js`) that displays a guitar cheatsheet for a 16-song George Michael tribute setlist. Optimized for iPad Air 11" in portrait orientation. One song per screen, no scrolling.

## Target device

- iPad Air 11", portrait orientation
- Viewed in Safari (no server required — open `index.html` directly)

## File structure

```
index.html   — layout, styling, JS logic
songs.js     — song data array (the only file you edit for chord changes)
```

## Song data format (`songs.js`)

```js
const SONGS = [
  {
    title: "Faith",
    artist: "George Michael",
    key: "C",
    bpm: 148,
    timeSignature: "4/4",
    capo: null,
    notes: "",
    sections: [
      { name: "Intro", chords: "C" },
      { name: "Verse", chords: "C  F  C" },
      { name: "Pre-Chorus", chords: "Dm  G  C  Am  Dm  G" },
      { name: "Chorus", chords: "C  F  C" },
      { name: "Outro", chords: "C  F  C  G  C" }
    ]
  },
  // ... 15 more songs
];
```

Fields:
- `title` — song name
- `artist` — always "George Michael" or "Wham!" as appropriate
- `key` — original key (string, e.g. "C", "Dm", "Ab")
- `bpm` — tempo in beats per minute
- `timeSignature` — e.g. "4/4", "6/8"
- `capo` — fret number or `null` if no capo
- `notes` — free-text performance notes (optional)
- `sections` — array of `{ name, chords }` objects
  - `name` — section label (Intro, Verse, Pre-Chorus, Chorus, Bridge, Outro, etc.)
  - `chords` — space-separated chord names as a string

## UI layout (portrait)

### Top bar
- Song title — large, bold, left-aligned
- Badges: Key (updates with transpose), BPM, Time Signature, Capo (if set)
- Transpose controls: `−` / `+` buttons with current shift shown (e.g. "+2")
- Dark/light mode toggle icon
- Edit mode toggle button

### Main area
- Section rows fill the screen
- Each row: section label on the left (fixed width), chords on the right
- If `notes` is present, shown as a muted line at the bottom
- All content fits one screen — no scrolling

### Bottom bar
- Horizontal scrollable song list — tap any title to jump
- Current song highlighted
- Song position indicator (e.g. "3 / 16")
- Swipe left/right on main area to navigate prev/next

## Features

### Transpose
- `−` / `+` buttons shift all chords by semitones
- Top bar shows transposed key: "Key: C (+2 → D)"
- Sharp/flat preference follows the target key (flat keys use flats)
- Per-song, resets on navigation
- Original data in `songs.js` is never modified

### Edit mode
- Toggle via Edit button in top bar
- Chord strings become inline-editable text fields
- Changes persist in `localStorage`
- Reset button reverts to original `songs.js` data
- Visual indicator when edit mode is active

### Dark/light mode
- **Dark:** background #1a1a1a, white chord text, muted gray labels
- **Light:** white background, dark text
- Toggle button in top bar
- Preference saved to `localStorage`

### Navigation
- Swipe left/right to move between songs
- Bottom bar song list for tap-to-jump
- Current position shown ("3 / 16")

## Styling

- System sans-serif font stack (San Francisco on iPad)
- Chord text: ~24-28pt, bold, high contrast
- Section labels: smaller, muted color, fixed-width column
- Section label color coding:
  - Verse — blue
  - Chorus — green
  - Bridge — orange
  - Pre-Chorus — purple
  - Intro/Outro — gray
  - Other — default muted
- Clean spacing, no decorative elements
- Touch-friendly tap targets (44pt minimum)

## Setlist (16 songs)

1. Faith
2. I'm Your Man
3. Fastlove
4. Wake Me Up Before You Go-Go
5. Amazing
6. Outside
7. Papa Was a Rolling Stone
8. Father Figure
9. Freedom! '90
10. Jesus to a Child
11. A Different Corner
12. Too Funky
13. Everything She Wants
14. Club Tropicana
15. Somebody to Love
16. Careless Whisper (Encore)

## Non-goals

- No audio playback or metronome
- No server-side logic
- No build tools or frameworks
- No offline PWA (can be added later)

## Tech

- Vanilla HTML, CSS, JavaScript
- No dependencies
- Works by opening `index.html` in Safari directly from Files app
