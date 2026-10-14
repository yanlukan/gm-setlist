# Stage and Practice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the song screen's top bar, menu, chord-shapes strip and song grid with two separate screens, Stage and Practice. They share one bar at the bottom, and everything else opens in sheets above that bar. Every Stage song must fit one 11-inch iPad Air screen, upright and on its side, with no chord under 20 px.

**Architecture:**
- **Store:** a new slice, `store/set-navigation.ts`, owns Previous, Next, each list's place and the extra song (a song from another list, played once). Pure selectors in `store/shown-song.ts` work out the song on screen and what Previous and Next lead to.
- **Bar and sheets:** one `BottomBar` opens one sheet at a time: Setlists, Songs, Notes, More or Chord Finder.
- **Screens:** `StageScreen` and `PracticeScreen` draw the chart from the same hook (`useSongChart`). They differ in their header and in what sits beside the chart.
- **Fit:** a new module, `hooks/fit-chart.ts`, sizes Stage's bar charts: the largest size that fits, two lines only where a bar needs them, and the 20 px floor.

**Tech Stack:** React 19, TypeScript 6, Vite 8, zustand 5, Vitest 4, @testing-library/react, fake-indexeddb, jsdom. Headless Chrome is used for the fit measurement.

**Spec:** docs/superpowers/specs/2026-10-13-stage-and-practice-design.md

## Global Constraints

**Device and layout**
- Target device: 11-inch iPad Air, 820 × 1180 upright and 1180 × 820 on its side. The phone comes after.
- The bottom bar is 64 px tall plus the safe area, and it is the only bar.
  - Its left group is the same on both screens: Setlists, Songs n/N, Previous, Next.
  - Then Stage has Notes and Practice. Practice has Finder, More and Stage.
- Sheets open above the bar, over the chart, one at a time. Escape or a tap outside closes a sheet. Previous and Next close any open sheet.

**Fit and sizes**
- Every Stage song fits on one screen, upright and on its side, with no chord under 20 px.
- The chord size runs from 20 up to 44 upright and 36 on its side. It is found by halving the range 8 times, rounded down to 0.5 px.
- Stage shows 4 bars a row upright with a 116 px gutter, and 8 bars a row on its side with a 44 px gutter.
- Practice shows 4 bars a row both ways and may scroll. Only Stage has to fit.
- A bar with 2 or more chords that would go under 20 px is drawn on two lines. A chord still too wide for its bar then shrinks in that bar alone.
- A song that cannot fit at 20 px stays at 20 px and scrolls.

**Behaviour**
- There is no tap tempo; BPM is shown as text. Notes are hidden on Stage and open with one tap (the Notes sheet).
- Nothing on the Stage chart reacts to a tap. A swipe still changes song. Stage allows no editing of any kind: no chord editor, no list editing, no capo, no transpose.
- The extra song is never saved: a relaunch never reopens on an extra. Each setlist remembers its own place.
- The pedal keeps its rule: it pages the chart first, then changes song. The view mode keeps its saved values, `'normal'` (Practice) and `'stage'` (Stage).
- On a phone narrower than 600 px, Previous and Next drop their titles, and Next drops its key and sound.

**Layering (z-index)**
- New: bar 150, sheet 145, sheet backdrop 140. The backdrop stops above the bar: `inset: 0 0 calc(64px + var(--safe-bottom)) 0`.
- Existing values stay as they are: Modal 200, menu backdrop 299, AddSongPicker 300, `.sl-screen` 350, `.songgrid-screen` 400, RestoreModal 500, toast 600.

**Code**
- Code files stay at 800 lines or fewer, and a new feature goes in a new module.
- Never append to `app/src/styles/layout.css` (1133 lines); deleting rules from it is fine.
- `app/src/store/use-store.ts` is at 795 lines: every task must leave it smaller or the same size.
- There is no `--surface` colour variable. Use `--bg`, `--picker-bg`, `--border`, `--text`, `--text-muted`, `--accent`, `--success`, `--danger`, `--badge-bg`, `--diagram-tile`, `--section-*`.

**Branch and commits**
- All work happens on branch `stage-practice`. It merges to `main` only when every test and the build pass and the 21-song measurement (Task 13) is clean. It is released as 4.0.0.
- Run `git status` before each commit and `git add` only the files the task names.
- Never commit `app/tsconfig.tsbuildinfo` or `demo-form-pdf/`.
- Never touch the `gx10` branch.
- Never quote or recall song lyrics, in code, tests or comments.
- Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Not in scope:** the phone layout beyond the under-600 px rule; syncing between devices; new chord content; the GX-10 rig.

**Commands:** run them from `/Users/krys/Documents/coding/cheetsheetForGuitarPlaying/app`.
- One test file: `npx vitest run <path>`
- Every test: `npx vitest run`
- Types: `npx tsc -b --noEmit`
- Build: `npm run build`

## Review Focus

1. **A deleted extra song or list.** The set's own song shows and Next moves on, with no blank screen. Pinned by `set-navigation.test.ts` ("a missing extra song: Next moves on", "deleting the extra custom song ends it", "deleting a setlist ends the extra") in Task 2, and `shown-song.test.ts` ("falls back to the set song when the extra song is gone") in Task 3.
2. **A saved place beyond a list that got shorter.** The list opens on its last song. Pinned by `set-navigation.test.ts` ("pulls a saved place back inside a list that got shorter") and `hydrate.test.ts` ("pulls a saved place beyond the end of the list back to the last song"), both in Task 2.
3. **Only the single position saved before 4.0.0.** The app reopens on that song. Pinned by `set-navigation.test.ts` ("turns the position saved before 4.0.0 into a place") and `hydrate.test.ts` ("reads the single position saved before 4.0.0"), both in Task 2.
4. **The keyboard on both screens.** No capo, guitar choice, Move chords, GX-10 sound or chord shapes anywhere. Pinned by `stage-screen.test.tsx` ("the keyboard shows no capo and no GX-10 sound") in Task 8, `practice-header.test.tsx` ("the keyboard has no capo, guitar or Move chords") in Task 9, and `practice-panel.test.tsx` ("the keyboard shows the book facts and no shapes") in Task 10.
5. **Switching to Stage in the middle of an edit, and relaunching in the middle of an extra.** Stage never shows the editor, and hydrate never restores an extra. Pinned by `hydrate.test.ts` ("never reopens on an extra song") in Task 2, and `screens.test.tsx` ("switching to Stage while editing shows Stage with no editor") in Task 11.

## File Structure

**Create:**

| File | Responsibility |
|---|---|
| `app/src/music/songbook.ts` | `songbookOf(song)`: the George Michael Complete songbook number |
| `app/src/store/set-navigation.ts` | Store slice: `places`, `extra`, `nextSong`, `prevSong`, `goToSong`, `playExtra`; `clampIndex`, `savePlaces`, `readPlaces` |
| `app/src/store/shown-song.ts` | Pure selectors: `setSongsOf`, `shownSongOf`, `neighboursOf` |
| `app/src/hooks/use-shown-song.ts` | `useShownSong()`, `useSetSongs(listId?)` for components |
| `app/src/components/sheets/Sheet.tsx` | The sheet frame: backdrop, dialog, Escape |
| `app/src/components/sheets/SetSongList.tsx` | A list's song rows (moved out of SongGrid) |
| `app/src/components/sheets/SongsSheet.tsx` | Songs sheet: the playing list |
| `app/src/components/sheets/SetlistsSheet.tsx` | Setlists sheet: every list, extras, Play this whole list |
| `app/src/components/sheets/NotesSheet.tsx` | Notes sheet |
| `app/src/components/sheets/MoreSheet.tsx` | More sheet: chart look, backups, version |
| `app/src/hooks/use-backup.ts` | Export/import backup actions (moved out of TopBar) |
| `app/src/hooks/use-song-chart.ts` | `useSongChart(song)`: everything a screen draws from a song |
| `app/src/hooks/use-chart-fit.ts` | `useChartFit(...)`: today's fit settings, used by both screens |
| `app/src/components/song/ChartBody.tsx` | The chart's parts and chords, the same on both screens |
| `app/src/components/song/EmptyList.tsx` | What shows when the playing list is empty |
| `app/src/components/stage/StageScreen.tsx` | Stage: header, chart, Next up |
| `app/src/components/stage/StageHeader.tsx` | Stage's two header rows |
| `app/src/components/stage/NextUp.tsx` | The "Next up" cue line |
| `app/src/components/practice/PracticeScreen.tsx` | Practice: header, chart, side panel or editor |
| `app/src/components/practice/PracticeHeader.tsx` | Practice title rows and facts |
| `app/src/components/practice/PracticeSetup.tsx` | Key, capo, guitar, Move chords, Edit/Done, Reset |
| `app/src/components/practice/PracticePanel.tsx` | Side panel: the shapes or the book facts |
| `app/src/components/practice/ShapeTiles.tsx` | Chord shape tiles (moved out of DiagramsBar) |
| `app/src/components/practice/BookFacts.tsx` | "From the book and the notes" |
| `app/src/hooks/fit-chart.ts` | `largestFit`, `layOutBars`, `useBandFit` for Stage |
| `app/src/styles/bottom-bar.css`, `sheets.css`, `stage.css`, `practice.css` | Styles for the new parts |
| `app/scripts/measure-stage.mjs` | Headless measurement of all 21 songs, both ways |

**Modify:**
- `app/src/types.ts`, `app/src/data/songs.ts`
- `app/src/store/use-store.ts`, `app/src/store/view-settings.ts`
- `app/src/components/layout/BottomBar.tsx`, `app/src/components/song/SongSheet.tsx`, `app/src/components/song/BandChart.tsx`, `app/src/App.tsx`
- `app/src/components/song/FormStrip.tsx`, `app/src/store/persistence.ts`
- `app/src/styles/bands.css`, `app/src/styles/global.css`; `app/src/styles/layout.css` (deletions only)
- `app/src/version.ts`

**Delete:** `components/layout/TopBar.tsx`, `components/layout/SongGrid.tsx`, `components/shared/TapTempo.tsx`, `components/diagrams/DiagramsBar.tsx`, `music/click.ts` (only tap tempo used it), and the tests that only cover them.

---

### Task 1: Songbook numbers on the songs

**Files:**
- Modify: `app/src/types.ts` (the `Song` interface, under `duration?: number`)
- Modify: `app/src/data/songs.ts` (17 songs)
- Create: `app/src/music/songbook.ts`
- Test: `app/src/tests/music/songbook.test.ts`

**Interfaces:**
- Consumes: `DEFAULT_SONGS` from `data/songs.ts`; `Song` from `types.ts`.
- Produces: `Song.songbook?: number`, and `songbookOf(song: Song): number | undefined` in `music/songbook.ts`. Task 9 (PracticeHeader) and Task 10 (BookFacts) use both.

- [ ] **Step 1: Make the branch**

Run: `cd /Users/krys/Documents/coding/cheetsheetForGuitarPlaying && git status --short && git checkout -b stage-practice`
Expected: only `?? app/tsconfig.tsbuildinfo` and `?? demo-form-pdf/` are listed, then `Switched to a new branch 'stage-practice'`.

- [ ] **Step 2: Write the failing test** at `app/src/tests/music/songbook.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { DEFAULT_SONGS } from '../../data/songs'
import { songbookOf } from '../../music/songbook'
import type { Song } from '../../types'

/** Numbers in the George Michael Complete songbook, from the user's own copy. */
const BOOK: Record<string, number> = {
  'Faith': 12,
  "I'm Your Man": 31,
  'Fastlove': 13,
  'Outside': 47,
  'Papa Was a Rolling Stone': 36,
  'Father Figure': 15,
  "Freedom! '90": 19,
  'Jesus to a Child': 35,
  'A Different Corner': 8,
  'Too Funky': 61,
  'Everything She Wants': 11,
  'Somebody to Love': 52,
  'Careless Whisper': 4,
  "I Can't Make You Love Me": 25,
  'Roxanne': 49,
  'Waiting (Reprise)': 63,
  'Kissing a Fool': 37,
}

const songNamed = (title: string) => DEFAULT_SONGS.find(s => s.title === title)!

describe('songbook numbers', () => {
  it('gives each of the 17 songs in the book its number', () => {
    for (const [title, number] of Object.entries(BOOK)) {
      expect(songNamed(title), title).toBeDefined()
      expect(songbookOf(songNamed(title)), title).toBe(number)
    }
  })

  it('has no number for the four songs not in the book', () => {
    const others = DEFAULT_SONGS.filter(s => !(s.title in BOOK)).map(s => s.title).sort()
    expect(others).toEqual(['Amazing', 'Club Tropicana', 'Last Christmas', 'Wake Me Up Before You Go-Go'])
    for (const title of others) expect(songbookOf(songNamed(title))).toBeUndefined()
  })

  it('finds the number for a copy of a built-in song that lost it, such as one from an old backup', () => {
    const copy: Song = { ...songNamed('Roxanne'), songbook: undefined }
    expect(songbookOf(copy)).toBe(49)
  })

  it('has no number for a song the player added', () => {
    const added = { title: 'Encore Jam', sections: [] } as unknown as Song
    expect(songbookOf(added)).toBeUndefined()
  })
})
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npx vitest run src/tests/music/songbook.test.ts`
Expected: FAIL, `Failed to resolve import "../../music/songbook"`.

- [ ] **Step 4: Add the field.** In `app/src/types.ts`, inside `interface Song`, directly under the `duration?: number` line, add:

```ts
  /** Its number in the George Michael Complete songbook, for the 17 songs in it. */
  songbook?: number
```

- [ ] **Step 5: Add the numbers.** In `app/src/data/songs.ts`, directly under each of these `title:` lines, add `    songbook: N,`, indented like the title. The line numbers are from before the first insert, so work from the bottom up or search by title.

| Line | Title | N |
|---|---|---|
| 5 | Faith | 12 |
| 29 | I'm Your Man | 31 |
| 65 | Fastlove | 13 |
| 139 | Outside | 47 |
| 161 | Papa Was a Rolling Stone | 36 |
| 187 | Father Figure | 15 |
| 213 | Freedom! '90 | 19 |
| 241 | Jesus to a Child | 35 |
| 286 | A Different Corner | 8 |
| 309 | Too Funky | 61 |
| 332 | Everything She Wants | 11 |
| 393 | Somebody to Love | 52 |
| 430 | Careless Whisper | 4 |
| 454 | I Can't Make You Love Me | 25 |
| 487 | Roxanne | 49 |
| 522 | Waiting (Reprise) | 63 |
| 546 | Kissing a Fool | 37 |

Wake Me Up Before You Go-Go, Amazing, Club Tropicana and Last Christmas get no number.

- [ ] **Step 6: Write `app/src/music/songbook.ts`**

```ts
import { DEFAULT_SONGS } from '../data/songs'
import type { Song } from '../types'

/**
 * The song's number in the George Michael Complete songbook, or undefined when
 * it is not in the book. A copy of a built-in song (from an old backup) finds
 * its number through the built-in song of the same title.
 */
export function songbookOf(song: Song): number | undefined {
  return song.songbook ?? DEFAULT_SONGS.find(s => s.title === song.title)?.songbook
}
```

- [ ] **Step 7: Run the test, the count and the types**

Run: `npx vitest run src/tests/music/songbook.test.ts && grep -c "songbook:" src/data/songs.ts && npx tsc -b --noEmit`
Expected: `4 passed`, then `17`, then no output from tsc.

- [ ] **Step 8: Run every test**

Run: `npx vitest run`
Expected: every test passes.

- [ ] **Step 9: Commit**

```bash
cd /Users/krys/Documents/coding/cheetsheetForGuitarPlaying && git status --short
git add app/src/types.ts app/src/data/songs.ts app/src/music/songbook.ts app/src/tests/music/songbook.test.ts
git commit -m "feat: songbook numbers for the 17 songs in the book

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Set navigation: each list's place and the extra song

**Files:**
- Create: `app/src/store/set-navigation.ts`
- Modify: `app/src/store/use-store.ts`
  - Delete: `SavedPosition` (about lines 27-32), `persistPosition` (172-176), the local `clampIndex` (180-184), the `nextSong`/`prevSong`/`goToSong` declarations in `StoreState` (216-218), and the navigation block (357-373).
  - Edit: `setActiveSetlist`, `createSetlist`, `deleteSetlist`, `duplicateSetlist`, `deleteCustomSong`, `restoreGigOrder` and `hydrate`.
- Test: `app/src/tests/store/set-navigation.test.ts` (new); `app/src/tests/store/hydrate.test.ts` (modify)

**Interfaces:**
- Consumes: `saveSetting(key, value)` and `getSetting<T>(key): Promise<T | undefined>` from `store/persistence.ts`; `StoreState` (type only) from `store/use-store.ts`.
- Produces, in `store/set-navigation.ts`:
  - `interface Extra { title: string; fromListId: string }`
  - `type Places = Record<string, number>`
  - `interface SetNavigation { places: Places; extra: Extra | null; nextSong(): void; prevSong(): void; goToSong(index: number): void; playExtra(title: string, fromListId: string): void }`
  - `clampIndex(index: number, length: number): number`
  - `savePlaces(places: Places, canSave: boolean): void`
  - `readPlaces(): Promise<Places | undefined>`
  - `setNavigation(set, get, canSave): SetNavigation`
- `StoreState` now extends `SetNavigation`, so `useStore.getState().playExtra`, `.extra` and `.places` exist. Tasks 3, 4 and 5 use them.

- [ ] **Step 1: Write the failing test** at `app/src/tests/store/set-navigation.test.ts`

The `beforeEach` is the same database reset that `src/tests/store/hydrate.test.ts` uses. If the two differ, copy hydrate.test.ts's.

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useStore } from '../../store/use-store'
import { db, resetDb, getSetting, saveSetting } from '../../store/persistence'
import { clampIndex, readPlaces, type Places } from '../../store/set-navigation'
import { GIG_SETLIST_2026 as G } from '../../data/songs'
import type { Song } from '../../types'

const toLand = (check: () => unknown) => vi.waitFor(check, { timeout: 5000, interval: 5 })

const twoLists = {
  activeId: 'default',
  lists: {
    default: { id: 'default', name: 'GM Tribute', songTitles: [...G] },
    short: { id: 'short', name: 'Encores', songTitles: [G[20], G[0], G[5]] },
  },
}

const state = () => useStore.getState()

beforeEach(async () => {
  resetDb()
  const database = await db()
  for (const store of ['songEdits', 'setlists', 'customSongs', 'settings', 'snapshots'] as const) {
    await database.clear(store)
  }
  useStore.setState(useStore.getInitialState())
  useStore.setState({ setlistData: twoLists })
})

describe('clampIndex', () => {
  it('keeps a position inside the list', () => {
    expect(clampIndex(4, 21)).toBe(4)
    expect(clampIndex(40, 21)).toBe(20)
    expect(clampIndex(-1, 21)).toBe(0)
    expect(clampIndex(3, 0)).toBe(0)
  })
})

describe('each list remembers its place', () => {
  it('reopens each list where the player left it', () => {
    state().goToSong(7)
    state().setActiveSetlist('short')
    expect(state().currentIndex).toBe(0) // never played
    state().goToSong(2)
    state().setActiveSetlist('default')
    expect(state().currentIndex).toBe(7)
    state().setActiveSetlist('short')
    expect(state().currentIndex).toBe(2)
  })

  it('keeps the place of a list left before any move', () => {
    useStore.setState({ currentIndex: 5 })
    state().setActiveSetlist('short')
    state().setActiveSetlist('default')
    expect(state().currentIndex).toBe(5)
  })

  it('pulls a saved place back inside a list that got shorter', () => {
    useStore.setState({ places: { short: 9 } })
    state().setActiveSetlist('short')
    expect(state().currentIndex).toBe(2)
  })

  it('saves the places', async () => {
    state().goToSong(7)
    await toLand(async () => expect(await getSetting<Places>('places')).toEqual({ default: 7 }))
    state().nextSong()
    await toLand(async () => expect(await getSetting<Places>('places')).toEqual({ default: 8 }))
  })
})

describe('an extra song from another list', () => {
  beforeEach(() => {
    state().goToSong(4)
    state().playExtra(G[20], 'short')
  })

  it('plays without moving in the set', () => {
    expect(state().extra).toEqual({ title: G[20], fromListId: 'short' })
    expect(state().currentIndex).toBe(4)
  })

  it('Next goes back to the song the player left', () => {
    state().nextSong()
    expect(state().extra).toBeNull()
    expect(state().currentIndex).toBe(4)
  })

  it('Previous goes to the song before the one left', () => {
    state().prevSong()
    expect(state().extra).toBeNull()
    expect(state().currentIndex).toBe(3)
  })

  it('a second extra still returns to the same song', () => {
    state().playExtra(G[0], 'short')
    state().nextSong()
    expect(state().currentIndex).toBe(4)
  })

  it('picking a song in the set ends the extra', () => {
    state().goToSong(10)
    expect(state().extra).toBeNull()
    expect(state().currentIndex).toBe(10)
  })

  it('switching lists ends the extra', () => {
    state().setActiveSetlist('short')
    expect(state().extra).toBeNull()
  })

  it('a missing extra song: Next moves on', () => {
    useStore.setState({ extra: { title: 'No Such Song', fromListId: 'short' } })
    state().nextSong()
    expect(state().currentIndex).toBe(5)
  })

  it('deleting the extra custom song ends it', () => {
    const jam = { title: 'Encore Jam', artist: 'The band', key: 'A', sections: [{ name: 'Verse', chords: 'A D E' }] } as unknown as Song
    expect(state().addCustomSong(jam)).toBe(true)
    state().playExtra('Encore Jam', 'short')
    state().deleteCustomSong('Encore Jam')
    expect(state().extra).toBeNull()
    expect(state().currentIndex).toBe(4)
  })

  it('deleting a setlist ends the extra', () => {
    state().deleteSetlist('short')
    expect(state().extra).toBeNull()
  })
})

describe('readPlaces', () => {
  it('is undefined when nothing was saved', async () => {
    expect(await readPlaces()).toBeUndefined()
  })

  it('reads the saved places, keeping only whole positions', async () => {
    await saveSetting('places', { default: 7, short: -1, odd: 1.5 })
    expect(await readPlaces()).toEqual({ default: 7 })
  })

  it('turns the position saved before 4.0.0 into a place', async () => {
    await saveSetting('position', { setlistId: 'short', index: 2 })
    expect(await readPlaces()).toEqual({ short: 2 })
  })

  it('prefers the places over the old position', async () => {
    await saveSetting('position', { setlistId: 'default', index: 2 })
    await saveSetting('places', { default: 9 })
    expect(await readPlaces()).toEqual({ default: 9 })
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/tests/store/set-navigation.test.ts`
Expected: FAIL, `Failed to resolve import "../../store/set-navigation"`.

- [ ] **Step 3: Write `app/src/store/set-navigation.ts`**

```ts
import type { StoreApi } from 'zustand'
import { getSetting, saveSetting } from './persistence'
import type { StoreState } from './use-store'

type Set = StoreApi<StoreState>['setState']
type Get = StoreApi<StoreState>['getState']

/** A song from another list, played once mid-set. Never saved: a relaunch opens on the set. */
export interface Extra { title: string; fromListId: string }

/** Where the player is in each setlist, by list id. */
export type Places = Record<string, number>

export interface SetNavigation {
  places: Places
  extra: Extra | null
  nextSong: () => void
  prevSong: () => void
  goToSong: (index: number) => void
  playExtra: (title: string, fromListId: string) => void
}

/** Keep a position inside a list of the given length. */
export function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0
  return Math.max(0, Math.min(index, length - 1))
}

export function savePlaces(places: Places, canSave: boolean): void {
  if (canSave) saveSetting('places', places).catch(e => console.warn('save places failed:', e))
}

/** Each list's place, or the single position saved before 4.0.0, or undefined. */
export async function readPlaces(): Promise<Places | undefined> {
  const saved = await getSetting<Places>('places')
  if (saved && typeof saved === 'object') {
    const places: Places = {}
    for (const [id, index] of Object.entries(saved)) {
      if (Number.isInteger(index) && index >= 0) places[id] = index
    }
    return places
  }
  const old = await getSetting<{ setlistId: string; index: number }>('position')
  if (old && typeof old.setlistId === 'string' && Number.isInteger(old.index) && old.index >= 0) {
    return { [old.setlistId]: old.index }
  }
  return undefined
}

export function setNavigation(set: Set, get: Get, canSave: () => boolean): SetNavigation {
  // Every move inside the set ends an extra and records the list's place
  const moveTo = (index: number, more: Partial<StoreState> = {}) => {
    const { setlistSongs, setlistData, places } = get()
    const currentIndex = clampIndex(index, setlistSongs().length)
    set({ ...more, currentIndex, extra: null, places: { ...places, [setlistData.activeId]: currentIndex } })
    savePlaces(get().places, canSave())
  }

  return {
    places: {},
    extra: null,
    nextSong: () => {
      const { extra, currentIndex, allSongs } = get()
      // After an extra, Next goes back to the song the player left; a vanished extra was never shown
      const returning = !!extra && allSongs().some(song => song.title === extra.title)
      moveTo(returning ? currentIndex : currentIndex + 1)
    },
    prevSong: () => moveTo(get().currentIndex - 1),
    goToSong: index => moveTo(index, { editMode: false }),
    playExtra: (title, fromListId) => set({ extra: { title, fromListId }, editMode: false }),
  }
}
```

- [ ] **Step 4: Wire it into `app/src/store/use-store.ts`**

1. Add the import next to the `viewSettings` import:
   ```ts
   import { clampIndex, readPlaces, savePlaces, setNavigation, type Places, type SetNavigation } from './set-navigation'
   ```
2. Delete the `SavedPosition` interface and its comment (lines 27-32), `persistPosition` (172-176), and the local `clampIndex` and its comment (180-184).
3. Change `export interface StoreState extends ViewSettings, ShapeSettings {` to:
   ```ts
   export interface StoreState extends ViewSettings, ShapeSettings, SetNavigation {
   ```
   Then delete the three declarations `nextSong`, `prevSong` and `goToSong` from the interface body (about lines 216-218). `SetNavigation` declares them now.
4. Directly under the `...shapeSettings(...)` spread (about line 268), add:
   ```ts
     ...setNavigation(set, get, () => !readOnly),
   ```
5. Delete the whole `// Navigation` block, from `nextSong: () => {` through the closing `},` of `goToSong` (about lines 357-373).
6. Replace `setActiveSetlist` with:
   ```ts
     setActiveSetlist: (id: string) => {
       const previous = get().setlistData
       set(state => ({
         setlistData: { ...state.setlistData, activeId: id },
         // Each list opens where the player left it; the list being left keeps its place
         currentIndex: clampIndex(state.places[id] ?? 0, state.setlistData.lists[id]?.songTitles.length ?? 0),
         places: { ...state.places, [state.setlistData.activeId]: state.currentIndex },
         extra: null,
       }))
       persistSetlist(previous, get().setlistData, 'switch setlist')
       savePlaces(get().places, !readOnly)
     },
   ```
7. In `createSetlist` and `duplicateSetlist`, under `currentIndex: 0,` in the object passed to `set`, add `extra: null,`.
8. In `deleteSetlist`, replace the `return { ... }` inside `set(state => { ... })` with:
   ```ts
         // 'default' may not exist, e.g. after importing someone else's backup
         const activeId = rest.default ? 'default' : remaining[0]
         return {
           setlistData: { lists: rest, activeId },
           currentIndex: clampIndex(state.places[activeId] ?? 0, rest[activeId].songTitles.length),
           extra: null,
         }
   ```
9. In `deleteCustomSong`, in the object returned inside `set(state => { ... })`, under the `currentIndex: clampIndex(...)` line, add:
   ```ts
         extra: state.extra?.title === title ? null : state.extra,
   ```
10. In `restoreGigOrder`, delete `currentIndex: 0,` from the returned object. Then, after the `persistSetlist(previous, get().setlistData, 'restore GM Tribute order')` line, add:
    ```ts
        get().goToSong(0)
    ```
11. In `hydrate`:
    - Change `let positionResult: SavedPosition | undefined` to `let placesResult: Places | undefined`.
    - In the `Promise.all` destructuring, rename `positionResult` to `placesResult`.
    - Replace `getSetting<SavedPosition>('position')` (the 4th entry) with `readPlaces()`.
    - Replace the whole `const savedIndex = ...` statement with:
      ```ts
      const savedIndex = placesResult?.[setlists.activeId] ?? 0
      ```
    - In the `set({ ... })` that holds `currentIndex: clampIndex(savedIndex, listLength)`, add:
      ```ts
        ...(placesResult && { places: placesResult }),
        extra: null,
      ```

- [ ] **Step 5: Run the new test and the types**

Run: `npx vitest run src/tests/store/set-navigation.test.ts && npx tsc -b --noEmit`
Expected: `22 passed`, then no output from tsc. If tsc names a leftover `persistPosition` or `SavedPosition`, delete that use. Moves now save through `savePlaces` instead.

- [ ] **Step 6: Port `app/src/tests/store/hydrate.test.ts`**

In the "relaunching" describe (about line 154):
- Replace the `positionSaved` helper with:
  ```ts
    const placesSaved = (index: number) =>
      toLand(async () => expect((await getSetting<Record<string, number>>('places'))?.default).toBe(index))
  ```
- Rename every `positionSaved(` call to `placesSaved(`.
- Keep 'starts at the top when the saved position was in a different setlist' as it is. It still passes, because the old position becomes the other list's place.

Add these tests at the end of the same describe. Add `GIG_SETLIST_2026 as G` to the `../../data/songs` import if the file does not have it, and `saveSetting` to the persistence import.

```ts
  it('reopens on the saved place of the playing list', async () => {
    await saveSetting('places', { default: 7, other: 3 })
    await useStore.getState().hydrate()
    expect(useStore.getState().currentIndex).toBe(7)
    expect(useStore.getState().places).toEqual({ default: 7, other: 3 })
  })

  it('reads the single position saved before 4.0.0', async () => {
    await saveSetting('position', { setlistId: 'default', index: 6 })
    await useStore.getState().hydrate()
    expect(useStore.getState().currentIndex).toBe(6)
  })

  it('pulls a saved place beyond the end of the list back to the last song', async () => {
    await saveSetting('places', { default: 40 })
    await useStore.getState().hydrate()
    expect(useStore.getState().currentIndex).toBe(20)
  })

  it('never reopens on an extra song', async () => {
    useStore.getState().playExtra(G[3], 'default')
    await useStore.getState().hydrate()
    expect(useStore.getState().extra).toBeNull()
  })
```

- [ ] **Step 7: Run the store tests, then every test**

Run: `npx vitest run src/tests/store && npx vitest run`
Expected: every test passes. If an older test outside the store folder checked the `'position'` setting, change it to read `'places'` (`{ [listId]: index }`).

- [ ] **Step 8: Check the size rule**

Run: `wc -l src/store/use-store.ts src/store/set-navigation.ts`
Expected: use-store.ts under 795 lines; set-navigation.ts under 100.

- [ ] **Step 9: Commit**

```bash
cd /Users/krys/Documents/coding/cheetsheetForGuitarPlaying && git status --short
git add app/src/store/set-navigation.ts app/src/store/use-store.ts app/src/tests/store/set-navigation.test.ts app/src/tests/store/hydrate.test.ts
git commit -m "feat: each setlist keeps its place, and a song from another list plays as an extra

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The shown song and its neighbours

**Files:**
- Create: `app/src/store/shown-song.ts`, `app/src/hooks/use-shown-song.ts`
- Modify: `app/src/store/use-store.ts` (the bodies of `setlistSongs` and `currentSong`, about lines 288-300)
- Test: `app/src/tests/store/shown-song.test.ts`, `app/src/tests/hooks/use-shown-song.test.tsx`

**Interfaces:**
- Consumes: `StoreState` with `songs`, `customSongs`, `setlistData`, `currentIndex` and `extra` (Task 2).
- Produces:
  - In `store/shown-song.ts`:
    - `type SongState = Pick<StoreState, 'songs' | 'customSongs' | 'setlistData' | 'currentIndex' | 'extra'>`
    - `setSongsOf(state: SongState, listId?: string): Song[]`
    - `interface ShownSong { song: Song | undefined; extraFrom: string | null }`; `shownSongOf(state): ShownSong`
    - `interface Neighbours { previous: Song | undefined; next: Song | undefined; returning: boolean }`; `neighboursOf(state): Neighbours`
  - In `hooks/use-shown-song.ts`:
    - `interface ShownSongView extends ShownSong, Neighbours { setSongs: Song[] }`
    - `useShownSong(): ShownSongView`
    - `useSetSongs(listId?: string): Song[]`
  - `useStore.getState().currentSong()` now returns the extra while one plays. Every screen that shows "the song" follows it.

- [ ] **Step 1: Write the failing selector test** at `app/src/tests/store/shown-song.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../../store/use-store'
import { neighboursOf, setSongsOf, shownSongOf } from '../../store/shown-song'
import { GIG_SETLIST_2026 as G } from '../../data/songs'

const twoLists = {
  activeId: 'default',
  lists: {
    default: { id: 'default', name: 'GM Tribute', songTitles: [...G] },
    short: { id: 'short', name: 'Encores', songTitles: [G[20], G[0], G[5]] },
  },
}
const state = () => useStore.getState()

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
  useStore.setState({ setlistData: twoLists, currentIndex: 4 })
})

describe('setSongsOf', () => {
  it('gives a list its songs in order', () => {
    expect(setSongsOf(state(), 'short').map(s => s.title)).toEqual([G[20], G[0], G[5]])
    expect(setSongsOf(state()).map(s => s.title)).toEqual([...G])
  })

  it('skips titles that have no song', () => {
    useStore.setState({ setlistData: { ...twoLists, lists: { ...twoLists.lists, short: { id: 'short', name: 'Encores', songTitles: ['Gone', G[0]] } } } })
    expect(setSongsOf(state(), 'short').map(s => s.title)).toEqual([G[0]])
  })

  it('gives an unknown list no songs', () => {
    expect(setSongsOf(state(), 'nope')).toEqual([])
  })
})

describe('shownSongOf', () => {
  it('shows the set song when no extra plays', () => {
    const shown = shownSongOf(state())
    expect(shown.song?.title).toBe(G[4])
    expect(shown.extraFrom).toBeNull()
  })

  it('shows the extra and names the list it came from', () => {
    state().playExtra(G[20], 'short')
    const shown = shownSongOf(state())
    expect(shown.song?.title).toBe(G[20])
    expect(shown.extraFrom).toBe('Encores')
  })

  it("says 'another list' when the extra's list is gone", () => {
    useStore.setState({ extra: { title: G[20], fromListId: 'gone' } })
    expect(shownSongOf(state()).extraFrom).toBe('another list')
  })

  it('falls back to the set song when the extra song is gone', () => {
    useStore.setState({ extra: { title: 'No Such Song', fromListId: 'short' } })
    const shown = shownSongOf(state())
    expect(shown.song?.title).toBe(G[4])
    expect(shown.extraFrom).toBeNull()
  })

  it('is what currentSong() returns', () => {
    state().playExtra(G[20], 'short')
    expect(state().currentSong()?.title).toBe(G[20])
  })
})

describe('neighboursOf', () => {
  it('names the songs either side of the current one', () => {
    const n = neighboursOf(state())
    expect([n.previous?.title, n.next?.title, n.returning]).toEqual([G[3], G[5], false])
  })

  it('after an extra, Next names the song the player left', () => {
    state().playExtra(G[20], 'short')
    const n = neighboursOf(state())
    expect([n.previous?.title, n.next?.title, n.returning]).toEqual([G[3], G[4], true])
  })

  it('has nothing before the first song or after the last', () => {
    useStore.setState({ currentIndex: 0 })
    expect(neighboursOf(state()).previous).toBeUndefined()
    useStore.setState({ currentIndex: 20 })
    expect(neighboursOf(state()).next).toBeUndefined()
  })
})
```

- [ ] **Step 2: Write the failing hook test** at `app/src/tests/hooks/use-shown-song.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStore } from '../../store/use-store'
import { useSetSongs, useShownSong } from '../../hooks/use-shown-song'
import { GIG_SETLIST_2026 as G } from '../../data/songs'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
  useStore.setState({ currentIndex: 4 })
})

describe('useShownSong', () => {
  it('follows the store', () => {
    const { result } = renderHook(() => useShownSong())
    expect(result.current.song?.title).toBe(G[4])
    expect(result.current.setSongs).toHaveLength(21)
    act(() => useStore.getState().playExtra(G[20], 'default'))
    expect(result.current.song?.title).toBe(G[20])
    expect(result.current.returning).toBe(true)
    expect(result.current.next?.title).toBe(G[4])
  })

  it('gives the same object until something changes', () => {
    const { result, rerender } = renderHook(() => useShownSong())
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })
})

describe('useSetSongs', () => {
  it('gives the playing list without an id', () => {
    const { result } = renderHook(() => useSetSongs())
    expect(result.current.map(s => s.title)).toEqual([...G])
  })
})
```

- [ ] **Step 3: Run both and watch them fail**

Run: `npx vitest run src/tests/store/shown-song.test.ts src/tests/hooks/use-shown-song.test.tsx`
Expected: FAIL, `Failed to resolve import "../../store/shown-song"` and `"../../hooks/use-shown-song"`.

- [ ] **Step 4: Write `app/src/store/shown-song.ts`**

```ts
import type { Song } from '../types'
import type { StoreState } from './use-store'

export type SongState = Pick<StoreState, 'songs' | 'customSongs' | 'setlistData' | 'currentIndex' | 'extra'>

const everySong = (state: SongState): Song[] => [...state.songs, ...state.customSongs]

/** A list's songs in order (the playing list by default); titles with no song are skipped. */
export function setSongsOf(state: SongState, listId: string = state.setlistData.activeId): Song[] {
  const list = state.setlistData.lists[listId]
  if (!list) return []
  const all = everySong(state)
  return list.songTitles
    .map(title => all.find(song => song.title === title))
    .filter((song): song is Song => song !== undefined)
}

export interface ShownSong { song: Song | undefined; extraFrom: string | null }

/** The song on screen: the extra while one plays, otherwise the set's current song. */
export function shownSongOf(state: SongState): ShownSong {
  const { extra } = state
  const extraSong = extra ? everySong(state).find(song => song.title === extra.title) : undefined
  if (extra && extraSong) {
    return { song: extraSong, extraFrom: state.setlistData.lists[extra.fromListId]?.name ?? 'another list' }
  }
  return { song: setSongsOf(state)[state.currentIndex], extraFrom: null }
}

export interface Neighbours { previous: Song | undefined; next: Song | undefined; returning: boolean }

/** Where Previous and Next lead. After an extra, Next returns to the song the player left. */
export function neighboursOf(state: SongState): Neighbours {
  const songs = setSongsOf(state)
  const returning = shownSongOf(state).extraFrom !== null
  const i = state.currentIndex
  return { previous: songs[i - 1], next: returning ? songs[i] : songs[i + 1], returning }
}
```

- [ ] **Step 5: Write `app/src/hooks/use-shown-song.ts`**

```ts
import { useMemo } from 'react'
import { useStore } from '../store/use-store'
import { neighboursOf, setSongsOf, shownSongOf, type Neighbours, type ShownSong, type SongState } from '../store/shown-song'
import type { Song } from '../types'

export interface ShownSongView extends ShownSong, Neighbours { setSongs: Song[] }

// zustand 5 needs stable selector results: select the pieces, derive with useMemo
export function useShownSong(): ShownSongView {
  const songs = useStore(s => s.songs)
  const customSongs = useStore(s => s.customSongs)
  const setlistData = useStore(s => s.setlistData)
  const currentIndex = useStore(s => s.currentIndex)
  const extra = useStore(s => s.extra)
  return useMemo(() => {
    const state: SongState = { songs, customSongs, setlistData, currentIndex, extra }
    return { ...shownSongOf(state), ...neighboursOf(state), setSongs: setSongsOf(state) }
  }, [songs, customSongs, setlistData, currentIndex, extra])
}

/** The songs of one list; the playing list when no id is given. */
export function useSetSongs(listId?: string): Song[] {
  const songs = useStore(s => s.songs)
  const customSongs = useStore(s => s.customSongs)
  const setlistData = useStore(s => s.setlistData)
  return useMemo(
    () => setSongsOf({ songs, customSongs, setlistData, currentIndex: 0, extra: null }, listId),
    [songs, customSongs, setlistData, listId],
  )
}
```

- [ ] **Step 6: Point the store at the selectors.** In `app/src/store/use-store.ts`:
  - Add `import { setSongsOf, shownSongOf } from './shown-song'`.
  - Replace the bodies of `setlistSongs` and `currentSong` (about lines 288-300) with:
    ```ts
      setlistSongs: () => setSongsOf(get()),
      currentSong: () => shownSongOf(get()).song,
    ```

- [ ] **Step 7: Run the new tests, the types and every test**

Run: `npx vitest run src/tests/store/shown-song.test.ts src/tests/hooks/use-shown-song.test.tsx && npx tsc -b --noEmit && npx vitest run`
Expected: `12 passed` then `4 passed`, no tsc output, then every test passes.

- [ ] **Step 8: Commit**

```bash
cd /Users/krys/Documents/coding/cheetsheetForGuitarPlaying && git status --short
git add app/src/store/shown-song.ts app/src/hooks/use-shown-song.ts app/src/store/use-store.ts app/src/tests/store/shown-song.test.ts app/src/tests/hooks/use-shown-song.test.tsx
git commit -m "feat: the shown song is the extra while one plays

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The bottom bar, the sheet frame and the Songs sheet

**Files:**
- Create: `app/src/components/sheets/Sheet.tsx`, `app/src/components/sheets/SetSongList.tsx`, `app/src/components/sheets/SongsSheet.tsx`, `app/src/styles/bottom-bar.css`, `app/src/styles/sheets.css`
- Modify (rewrite): `app/src/components/layout/BottomBar.tsx`
- Modify: `app/src/styles/global.css` (two `@import` lines)
- Test: `app/src/tests/components/song-nav.test.tsx` (rewrite)

**Interfaces:**
- Consumes: `useShownSong()` (Task 3); `goToSong`, `nextSong`, `prevSong` and `extra` (Task 2); `toggleViewMode` and `viewMode` from view-settings; `playedKey`, `formatLength` and `setLength` from `music/setlist-text`; `bandPlanFor` and `positionLabel` from `hooks/use-band-positions`; `hasEditedChart`; `SetlistScreen({ onClose })`.
- Produces:
  - `Sheet({ label: string, onClose: () => void, className?: string, children })`
  - `SetSongList({ songs: Song[], currentIndex: number | null, leftIndex: number | null, onPick: (index: number) => void })`
  - `SongsSheet({ onStage: boolean, onClose: () => void })`
  - `type SheetName = 'setlists' | 'songs' | 'notes' | 'more' | 'finder'`, exported from `BottomBar.tsx`
  - `BottomBar()` renders `nav[aria-label="Song controls"]`. Tasks 5 and 6 add buttons to it.
  - CSS classes: `.bottom-bar`, `.bb-btn`, `.bb-prev`, `.bb-next`, `.is-return`, `.bb-text`, `.bb-kicker`, `.bb-title`, `.bb-meta`, `.bb-key`, `.bb-preset`, `.bb-count`, `.bb-spacer`, `.sheet-backdrop`, `.sheet`, `.sheet-head`, `.sheet-title`, `.sheet-sub`, `.sheet-hint`, `.sheet-action`, `.set-song-list`, `.songtile-left`.

The old bar's "Next up" line is dropped here; Task 8 brings it back on Stage as `NextUp`. If a test outside `song-nav.test.tsx` checks "Next up", leave that test failing until Task 8 and record it as a ruling in the ledger.

- [ ] **Step 1: Write the failing test.** Replace all of `app/src/tests/components/song-nav.test.tsx` with:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { BottomBar } from '../../components/layout/BottomBar'
import { useStore } from '../../store/use-store'
import { GIG_SETLIST_2026 as G } from '../../data/songs'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})

const bar = () => screen.getByRole('navigation', { name: 'Song controls' })
const button = (name: string | RegExp) => screen.getByRole('button', { name })
const isDisabled = (el: HTMLElement) => (el as HTMLButtonElement).disabled
const openSongs = () => fireEvent.click(button(/^Songs, /))
const songsSheet = () => screen.getByRole('dialog', { name: 'All songs' })
const row = (title: string) => within(songsSheet()).getByText(title).closest('button')!

describe('Previous and Next', () => {
  it('Next names the next song and goes there', () => {
    render(<BottomBar />)
    fireEvent.click(button(`Next song: ${G[1]}`))
    expect(useStore.getState().currentIndex).toBe(1)
  })

  it('Previous names the song before and goes back', () => {
    useStore.getState().goToSong(1)
    render(<BottomBar />)
    fireEvent.click(button(`Previous song: ${G[0]}`))
    expect(useStore.getState().currentIndex).toBe(0)
  })

  it('cannot go before the start or past the end', () => {
    render(<BottomBar />)
    expect(isDisabled(button('Start of set'))).toBe(true)
    act(() => useStore.getState().goToSong(20))
    expect(isDisabled(button('End of set'))).toBe(true)
  })

  it('after an extra, Next reads Back to the set and names the song left', () => {
    useStore.getState().goToSong(4)
    useStore.getState().playExtra(G[20], 'default')
    render(<BottomBar />)
    const back = button(`Back to the set: ${G[4]}`)
    expect(back.classList.contains('is-return')).toBe(true)
    expect(within(back).getByText('Back to the set')).toBeTruthy()
    fireEvent.click(back)
    expect(useStore.getState().extra).toBeNull()
    expect(useStore.getState().currentIndex).toBe(4)
  })

  it('closes an open sheet when moving song', () => {
    render(<BottomBar />)
    openSongs()
    fireEvent.click(button(`Next song: ${G[1]}`))
    expect(screen.queryByRole('dialog', { name: 'All songs' })).toBeNull()
  })
})

describe('the Songs sheet', () => {
  it('shows the place in the set on its button', () => {
    useStore.getState().goToSong(4)
    render(<BottomBar />)
    expect(button('Songs, 5 of 21')).toBeTruthy()
  })

  it('opens and closes from its button', () => {
    render(<BottomBar />)
    openSongs()
    expect(button(/^Songs, /).getAttribute('aria-expanded')).toBe('true')
    openSongs()
    expect(screen.queryByRole('dialog', { name: 'All songs' })).toBeNull()
  })

  it('lists every song with the count and the length of the set', () => {
    render(<BottomBar />)
    openSongs()
    for (const title of G) expect(within(songsSheet()).getByText(title)).toBeTruthy()
    expect(within(songsSheet()).getByText(/21 songs · about 1 h 39 m/)).toBeTruthy()
  })

  it('goes to a song and closes', () => {
    render(<BottomBar />)
    openSongs()
    fireEvent.click(row('Roxanne'))
    expect(useStore.getState().currentIndex).toBe(G.indexOf('Roxanne'))
    expect(screen.queryByRole('dialog', { name: 'All songs' })).toBeNull()
  })

  it('marks the song playing now', () => {
    useStore.getState().goToSong(2)
    render(<BottomBar />)
    openSongs()
    expect(row('Club Tropicana').getAttribute('aria-current')).toBe('true')
  })

  it('shows the played key and the transpose, then LOWER KEY when back in the band key', () => {
    render(<BottomBar />)
    openSongs()
    expect(within(row('Careless Whisper')).getByText('Cm')).toBeTruthy()
    expect(within(row('Careless Whisper')).getByText('-2')).toBeTruthy()
    act(() => useStore.getState().setTranspose('Careless Whisper', 0))
    expect(within(row('Careless Whisper')).getByText('LOWER KEY')).toBeTruthy()
  })

  it("shows a song's length", () => {
    render(<BottomBar />)
    openSongs()
    expect(within(row('Waiting (Reprise)')).getByText('2:27')).toBeTruthy()
  })

  it('during an extra marks the song the player left, and nothing as playing', () => {
    useStore.getState().goToSong(4)
    useStore.getState().playExtra(G[20], 'default')
    render(<BottomBar />)
    openSongs()
    expect(within(row(G[4])).getByText('you left here')).toBeTruthy()
    expect(within(songsSheet()).queryAllByRole('button').filter(b => b.getAttribute('aria-current'))).toHaveLength(0)
  })

  it('on Stage says a tap goes there and offers no editing', () => {
    useStore.setState({ viewMode: 'stage' })
    render(<BottomBar />)
    openSongs()
    expect(within(songsSheet()).getByText(/Tap a song to go there/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Edit list' })).toBeNull()
  })

  it('on Practice offers Edit list', () => {
    render(<BottomBar />)
    openSongs()
    expect(button('Edit list')).toBeTruthy()
  })
})

describe('the screen buttons', () => {
  it('Practice offers Stage, and Stage offers Practice', () => {
    render(<BottomBar />)
    fireEvent.click(button('Switch to Stage'))
    expect(useStore.getState().viewMode).toBe('stage')
    fireEvent.click(button('Switch to Practice'))
    expect(useStore.getState().viewMode).toBe('normal')
  })

  it('keeps getting around on the left', () => {
    render(<BottomBar />)
    const names = within(bar()).getAllByRole('button').map(b => b.getAttribute('aria-label'))
    expect(names.slice(0, 3)).toEqual(['Songs, 1 of 21', 'Start of set', `Next song: ${G[1]}`])
  })
})

describe('on a phone', () => {
  it('drops the titles, key and sound under 600 px', () => {
    const css = readFileSync(new URL('../../styles/bottom-bar.css', import.meta.url), 'utf8')
    expect(css).toMatch(/@media \(max-width: 599px\) \{\s*\.bb-title, \.bb-key, \.bb-preset \{ display: none; \}/)
  })
})
```

If `src/tests/components/chart-styles.test.ts` reads CSS files another way (for example with a `path.resolve` helper), read `bottom-bar.css` the same way it does.

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/tests/components/song-nav.test.tsx`
Expected: FAIL. `Unable to find an accessible element with the role "navigation" and name "Song controls"`, and `ENOENT` for bottom-bar.css.

- [ ] **Step 3: Write `app/src/components/sheets/Sheet.tsx`**

```tsx
import { useEffect, type ReactNode } from 'react'

interface Props {
  label: string
  onClose: () => void
  className?: string
  children: ReactNode
}

/** A panel that opens above the bottom bar, over the chart. Escape or a tap outside closes it. */
export function Sheet({ label, onClose, className, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div className="sheet-backdrop" aria-hidden="true" onClick={onClose} />
      <section role="dialog" aria-label={label} className={className ? `sheet ${className}` : 'sheet'}>
        {children}
      </section>
    </>
  )
}
```

- [ ] **Step 4: Write `app/src/components/sheets/SetSongList.tsx`.** The rows are SongGrid's rows; SongGrid is deleted in Task 11.

```tsx
import { useEffect, useMemo, useRef } from 'react'
import { useChartView, useStore } from '../../store/use-store'
import { formatLength, playedKey } from '../../music/setlist-text'
import { bandPlanFor, positionLabel } from '../../hooks/use-band-positions'
import { hasEditedChart } from '../../music/chart-edits'
import type { Song } from '../../types'

interface Props {
  songs: Song[]
  /** The row playing now, or null when nothing in this list is playing. */
  currentIndex: number | null
  /** The set song an extra was played from, marked "you left here". */
  leftIndex: number | null
  onPick: (index: number) => void
}

/** A list's songs as rows: number, title, key, length and what to know before playing. */
export function SetSongList({ songs, currentIndex, leftIndex, onPick }: Props) {
  const edits = useStore(s => s.edits)
  const view = useChartView()
  const positions = useMemo(
    () => (view.instrument === 'keyboard' ? [] : songs.map(song => positionLabel(bandPlanFor(song, edits[song.title], view).span))),
    [songs, edits, view],
  )
  const currentRef = useRef<HTMLButtonElement>(null)
  const focusIndex = currentIndex ?? leftIndex

  useEffect(() => {
    currentRef.current?.scrollIntoView?.({ block: 'center' })
  }, [])

  return (
    <div className="set-song-list">
      {songs.map((song, i) => {
        const { key, semitones } = playedKey(song, edits[song.title])
        const position = positions[i]
        const isCurrent = i === currentIndex
        return (
          <button
            key={song.title}
            ref={i === focusIndex ? currentRef : undefined}
            className={isCurrent ? 'songtile is-current' : 'songtile'}
            aria-current={isCurrent ? 'true' : undefined}
            onClick={() => onPick(i)}
          >
            <span className="songtile-num">{i + 1}</span>
            <span className="songtile-main">
              <span className="songtile-title">{song.title}</span>
              <span className="songtile-meta">
                {i === leftIndex && <span className="songtile-left">you left here</span>}
                {key && <span>{key}</span>}
                {song.duration && <span>{formatLength(song.duration)}</span>}
                {semitones !== 0 && (
                  <span className="chip chip-transpose">{semitones > 0 ? `+${semitones}` : semitones}</span>
                )}
                {song.lowerKey && semitones === 0 && <span className="chip chip-warn">LOWER KEY</span>}
                {hasEditedChart(song, edits[song.title]) && (
                  <span className="chip chip-edited" title="This song shows your own chords, not the built-in chart">EDITED</span>
                )}
                {position && (
                  <span className="songtile-position" aria-label={`Recommended position: ${position}`}>{position}</span>
                )}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5: Write `app/src/components/sheets/SongsSheet.tsx`**

```tsx
import { useState } from 'react'
import { useStore } from '../../store/use-store'
import { useShownSong } from '../../hooks/use-shown-song'
import { setLength } from '../../music/setlist-text'
import { SetlistScreen } from '../setlist/SetlistScreen'
import { Sheet } from './Sheet'
import { SetSongList } from './SetSongList'

/** Every song in the playing list. Stage only moves around it; Practice can also edit the list. */
export function SongsSheet({ onStage, onClose }: { onStage: boolean; onClose: () => void }) {
  const { setSongs, extraFrom } = useShownSong()
  const currentIndex = useStore(s => s.currentIndex)
  const goToSong = useStore(s => s.goToSong)
  const listName = useStore(s => s.setlistData.lists[s.setlistData.activeId]?.name ?? 'Setlist')
  const [editing, setEditing] = useState(false)
  const length = setLength(setSongs)

  return (
    <>
      <Sheet label="All songs" onClose={onClose} className="songs-sheet">
        <div className="sheet-head">
          <h2 className="sheet-title">{listName}</h2>
          <span className="sheet-sub">{setSongs.length} songs{length ? ` · about ${length}` : ''}</span>
          {!onStage && <button className="sheet-action" onClick={() => setEditing(true)}>Edit list</button>}
        </div>
        {onStage && <p className="sheet-hint">Tap a song to go there.</p>}
        <SetSongList
          songs={setSongs}
          currentIndex={extraFrom ? null : currentIndex}
          leftIndex={extraFrom ? currentIndex : null}
          onPick={i => {
            goToSong(i)
            onClose()
          }}
        />
      </Sheet>
      {editing && <SetlistScreen onClose={() => setEditing(false)} />}
    </>
  )
}
```

- [ ] **Step 6: Rewrite `app/src/components/layout/BottomBar.tsx`**

```tsx
import { useState } from 'react'
import { useStore } from '../../store/use-store'
import { useShownSong } from '../../hooks/use-shown-song'
import { playedKey } from '../../music/setlist-text'
import { SongsSheet } from '../sheets/SongsSheet'

/** The sheets the bar opens; only one is open at a time. */
export type SheetName = 'setlists' | 'songs' | 'notes' | 'more' | 'finder'

/**
 * The only bar, at the bottom of both screens. Getting around comes first and
 * is the same on Stage and Practice; the screen's own buttons follow. Next is
 * the big one: it names the song it goes to, with its key and GX-10 sound, and
 * after an extra it reads Back to the set.
 */
export function BottomBar() {
  const { previous, next, returning, setSongs } = useShownSong()
  const currentIndex = useStore(s => s.currentIndex)
  const edits = useStore(s => s.edits)
  const instrument = useStore(s => s.instrument)
  const onStage = useStore(s => s.viewMode === 'stage')
  const nextSong = useStore(s => s.nextSong)
  const prevSong = useStore(s => s.prevSong)
  const toggleViewMode = useStore(s => s.toggleViewMode)
  const [open, setOpen] = useState<SheetName | null>(null)

  const toggle = (name: SheetName) => setOpen(shown => (shown === name ? null : name))
  const close = () => setOpen(null)
  const total = setSongs.length
  const place = total ? currentIndex + 1 : 0
  const nextKey = next ? playedKey(next, edits[next.title]).key : ''
  const nextLabel = !next ? 'End of set' : returning ? `Back to the set: ${next.title}` : `Next song: ${next.title}`

  return (
    <>
      <nav className="bottom-bar" aria-label="Song controls">
        <button
          className="bb-btn bb-songs"
          aria-label={`Songs, ${place} of ${total}`}
          aria-expanded={open === 'songs'}
          disabled={total === 0}
          onClick={() => toggle('songs')}
        >
          Songs <span className="bb-count">{place}/{total}</span>
        </button>

        <button
          className="bb-btn bb-prev"
          aria-label={previous ? `Previous song: ${previous.title}` : 'Start of set'}
          disabled={!previous}
          onClick={() => {
            close()
            prevSong()
          }}
        >
          <span className="bb-arrow" aria-hidden="true">&#9664;</span>
          {previous && (
            <span className="bb-text">
              <span className="bb-kicker">Previous</span>
              <span className="bb-title">{previous.title}</span>
            </span>
          )}
        </button>

        <button
          className={returning ? 'bb-btn bb-next is-return' : 'bb-btn bb-next'}
          aria-label={nextLabel}
          disabled={!next}
          onClick={() => {
            close()
            nextSong()
          }}
        >
          <span className="bb-text">
            <span className="bb-kicker">{!next ? 'End of set' : returning ? 'Back to the set' : 'Next'}</span>
            {next && <span className="bb-title">{next.title}</span>}
            {next && (
              <span className="bb-meta">
                {nextKey && <span className="bb-key">{nextKey}</span>}
                {/* The sound to switch to before the next song: the guitarist's GX-10, not the keyboard's */}
                {next.preset && instrument === 'guitar' && <span className="bb-preset">{next.preset.name}</span>}
              </span>
            )}
          </span>
          <span className="bb-arrow" aria-hidden="true">&#9654;</span>
        </button>

        <span className="bb-spacer" />

        {onStage ? (
          <button className="bb-btn" aria-label="Switch to Practice" onClick={() => { close(); toggleViewMode() }}>
            Practice
          </button>
        ) : (
          <button className="bb-btn" aria-label="Switch to Stage" onClick={() => { close(); toggleViewMode() }}>
            Stage
          </button>
        )}
      </nav>

      {open === 'songs' && <SongsSheet onStage={onStage} onClose={close} />}
    </>
  )
}
```

- [ ] **Step 7: Write `app/src/styles/bottom-bar.css`**

```css
/* The one bar, at the bottom of both screens */
.bottom-bar {
  position: relative;
  z-index: 150;
  flex: none;
  display: flex;
  align-items: stretch;
  gap: 6px;
  height: calc(64px + var(--safe-bottom));
  padding: 6px calc(8px + var(--safe-right)) calc(6px + var(--safe-bottom)) calc(8px + var(--safe-left));
  background: var(--picker-bg);
  border-top: 1px solid var(--border);
}
.bb-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 52px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
  font-size: 15px;
  font-weight: 600;
}
.bb-btn:disabled { opacity: 0.4; }
.bb-btn[aria-expanded='true'] { border-color: var(--accent); color: var(--accent); }
.bb-prev { flex: 1 1 0; min-width: 0; justify-content: flex-start; }
.bb-next { flex: 1.6 1 0; min-width: 0; justify-content: space-between; background: var(--accent); border-color: var(--accent); color: var(--bg); }
.bb-next.is-return { background: #f59e0b; border-color: #f59e0b; color: #111; }
.bb-text { display: flex; flex-direction: column; min-width: 0; text-align: left; line-height: 1.15; }
.bb-kicker { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; opacity: 0.8; }
.bb-title { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.bb-meta { display: flex; gap: 8px; font-size: 12px; font-weight: 500; opacity: 0.85; }
.bb-count { color: var(--text-muted); font-weight: 500; font-variant-numeric: tabular-nums; }
.bb-spacer { flex: 0 0 8px; }

@media (max-width: 599px) {
  .bb-title, .bb-key, .bb-preset { display: none; }
  .bb-btn { padding: 0 8px; }
}
```

- [ ] **Step 8: Write `app/src/styles/sheets.css`**

```css
/* Sheets open above the bottom bar, over the chart; one at a time */
.sheet-backdrop {
  position: fixed;
  inset: 0 0 calc(64px + var(--safe-bottom)) 0;
  z-index: 140;
  background: rgb(0 0 0 / 0.35);
}
.sheet {
  position: fixed;
  left: calc(8px + var(--safe-left));
  right: calc(8px + var(--safe-right));
  bottom: calc(64px + var(--safe-bottom));
  z-index: 145;
  max-height: calc(100% - 88px - var(--safe-bottom) - var(--safe-top));
  overflow-y: auto;
  padding: 16px;
  background: var(--picker-bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-bottom: none;
  border-radius: 14px 14px 0 0;
  box-shadow: 0 -8px 24px rgb(0 0 0 / 0.25);
}
.sheet-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 12px; margin-bottom: 12px; }
.sheet-title { margin: 0; font-size: 20px; font-weight: 700; }
.sheet-sub { color: var(--text-muted); font-size: 14px; }
.sheet-hint { margin: 0 0 12px; color: var(--text-muted); font-size: 14px; }
.sheet-action {
  margin-left: auto;
  padding: 8px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
  font-weight: 600;
}
.sheet-action + .sheet-action { margin-left: 0; }
.set-song-list { display: grid; gap: 6px; }
.songtile-left { color: var(--accent); font-weight: 600; }
```

- [ ] **Step 9: Import both files.** In `app/src/styles/global.css`, next to the other `@import` lines at the top, add:

```css
@import './bottom-bar.css';
@import './sheets.css';
```

- [ ] **Step 10: Run the test, the types and every test**

Run: `npx vitest run src/tests/components/song-nav.test.tsx && npx tsc -b --noEmit && npx vitest run`
Expected: `18 passed`, no tsc output, then every test passes. The exception is any "Next up" test ruled in the ledger as above.

- [ ] **Step 11: Look at it.** Start the dev server (preview_start, or `npm run dev`) at 820 × 1180. The bar sits at the bottom with Songs, Previous, Next and Stage. Songs opens the sheet above the bar, and a tap on the dimmed chart closes it.

- [ ] **Step 12: Commit**

```bash
cd /Users/krys/Documents/coding/cheetsheetForGuitarPlaying && git status --short
git add app/src/components/sheets/Sheet.tsx app/src/components/sheets/SetSongList.tsx app/src/components/sheets/SongsSheet.tsx app/src/components/layout/BottomBar.tsx app/src/styles/bottom-bar.css app/src/styles/sheets.css app/src/styles/global.css app/src/tests/components/song-nav.test.tsx
git commit -m "feat: one bar at the bottom, with the Songs sheet above it

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The Setlists sheet and the extra song

**Files:**
- Create: `app/src/components/sheets/SetlistsSheet.tsx`
- Modify: `app/src/components/layout/BottomBar.tsx` (a Setlists button first in the bar, and its sheet)
- Modify: `app/src/styles/sheets.css` (append the Setlists sheet rules)
- Test: `app/src/tests/components/setlists-sheet.test.tsx` (new); `app/src/tests/components/song-nav.test.tsx` (one expectation)

**Interfaces:**
- Consumes: `Sheet`, `SetSongList` and `SheetName` (Task 4); `useShownSong()` and `useSetSongs(listId?)` (Task 3); `goToSong(index)`, `playExtra(title, fromListId)` and `setActiveSetlist(id)` (Task 2: switching lists ends any extra and opens the list at its saved place); `setLength` from `music/setlist-text`; `SetlistScreen({ onClose })`.
- Produces:
  - `SetlistsSheet({ onStage: boolean, onClose: () => void })`, a dialog named "Setlists".
  - The bar's first button: `aria-label="Setlists"`, `aria-expanded`.
  - CSS classes: `.setlists-sheet`, `.lists-col`, `.lists-item`, `.lists-name`, `.lists-count`, `.lists-tag`, `.lists-songs`, `.sheet-action.is-primary`.

The class prefix is `lists-`, not `sl-`: `layout.css` already uses `.sl-row`, `.sl-tab` and `.sl-remove` for the setlist editor.

- [ ] **Step 1: Write the failing test** at `app/src/tests/components/setlists-sheet.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { BottomBar } from '../../components/layout/BottomBar'
import { useStore } from '../../store/use-store'
import { GIG_SETLIST_2026 as G } from '../../data/songs'

const lists = {
  activeId: 'default',
  lists: {
    default: { id: 'default', name: 'GM Tribute', songTitles: [...G] },
    short: { id: 'short', name: 'Encores', songTitles: [G[20], G[0], G[5]] },
    spare: { id: 'spare', name: 'Spare', songTitles: [] },
  },
}

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
  useStore.setState({ setlistData: lists })
})

const button = (name: string | RegExp) => screen.getByRole('button', { name })
const openSetlists = () => fireEvent.click(button('Setlists'))
const sheet = () => screen.getByRole('dialog', { name: 'Setlists' })
const list = (name: RegExp) => within(sheet()).getByRole('button', { name })
const row = (title: string) => within(sheet()).getByText(title).closest('button')!

describe('the Setlists sheet', () => {
  it('opens from the first button in the bar and marks the list playing now', () => {
    render(<BottomBar />)
    openSetlists()
    expect(button('Setlists').getAttribute('aria-expanded')).toBe('true')
    expect(within(list(/^GM Tribute/)).getByText('PLAYING NOW')).toBeTruthy()
    expect(list(/^GM Tribute/).getAttribute('aria-pressed')).toBe('true')
    expect(within(list(/^Encores/)).queryByText('PLAYING NOW')).toBeNull()
  })

  it("shows the tapped list's songs on the right", () => {
    render(<BottomBar />)
    openSetlists()
    fireEvent.click(list(/^Encores/))
    expect(list(/^Encores/).getAttribute('aria-pressed')).toBe('true')
    expect(within(sheet()).getByText(G[20])).toBeTruthy()
    expect(within(sheet()).queryByText(G[1])).toBeNull()
  })

  it('in the playing list, a tap goes to that song and closes', () => {
    render(<BottomBar />)
    openSetlists()
    fireEvent.click(row(G[3]))
    expect(useStore.getState().currentIndex).toBe(3)
    expect(useStore.getState().extra).toBeNull()
    expect(screen.queryByRole('dialog', { name: 'Setlists' })).toBeNull()
  })

  it('in another list, a tap plays that song as an extra and keeps the place in the set', () => {
    useStore.getState().goToSong(4)
    render(<BottomBar />)
    openSetlists()
    fireEvent.click(list(/^Encores/))
    expect(within(sheet()).getByText(`Tap a song to play it as an extra. Next then reads Back to the set and takes you to ${G[4]}.`)).toBeTruthy()
    fireEvent.click(row(G[20]))
    expect(useStore.getState().extra).toEqual({ title: G[20], fromListId: 'short' })
    expect(useStore.getState().currentIndex).toBe(4)
    expect(useStore.getState().setlistData.activeId).toBe('default')
    expect(screen.queryByRole('dialog', { name: 'Setlists' })).toBeNull()
    expect(button(`Back to the set: ${G[4]}`)).toBeTruthy()
  })

  it('Play this whole list switches the set and closes', () => {
    render(<BottomBar />)
    openSetlists()
    fireEvent.click(list(/^Encores/))
    fireEvent.click(button('Play this whole list'))
    expect(useStore.getState().setlistData.activeId).toBe('short')
    expect(useStore.getState().currentIndex).toBe(0)
    expect(screen.queryByRole('dialog', { name: 'Setlists' })).toBeNull()
    expect(button('Songs, 1 of 3')).toBeTruthy()
  })

  it('Play this whole list ends an extra', () => {
    useStore.getState().playExtra(G[20], 'short')
    render(<BottomBar />)
    openSetlists()
    fireEvent.click(list(/^Encores/))
    fireEvent.click(button('Play this whole list'))
    expect(useStore.getState().extra).toBeNull()
  })

  it('during an extra marks the song the player left in the playing list', () => {
    useStore.getState().goToSong(4)
    useStore.getState().playExtra(G[20], 'short')
    render(<BottomBar />)
    openSetlists()
    expect(within(row(G[4])).getByText('you left here')).toBeTruthy()
  })

  it('an empty list says so and cannot be played', () => {
    render(<BottomBar />)
    openSetlists()
    fireEvent.click(list(/^Spare/))
    expect(within(sheet()).getByText('This list is empty.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Play this whole list' })).toBeNull()
  })

  it('on Stage offers no editing in any list', () => {
    useStore.setState({ viewMode: 'stage' })
    render(<BottomBar />)
    openSetlists()
    expect(screen.queryByRole('button', { name: 'Edit list' })).toBeNull()
    fireEvent.click(list(/^Encores/))
    expect(screen.queryByRole('button', { name: 'Edit list' })).toBeNull()
  })

  it('on Practice the playing list offers Edit list, another list does not', () => {
    render(<BottomBar />)
    openSetlists()
    expect(button('Edit list')).toBeTruthy()
    fireEvent.click(list(/^Encores/))
    expect(screen.queryByRole('button', { name: 'Edit list' })).toBeNull()
  })

  it('opening Songs closes Setlists: one sheet at a time', () => {
    render(<BottomBar />)
    openSetlists()
    fireEvent.click(button(/^Songs, /))
    expect(screen.queryByRole('dialog', { name: 'Setlists' })).toBeNull()
    expect(screen.getByRole('dialog', { name: 'All songs' })).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/tests/components/setlists-sheet.test.tsx`
Expected: FAIL. `Unable to find an accessible element with the role "button" and name "Setlists"`.

- [ ] **Step 3: Write `app/src/components/sheets/SetlistsSheet.tsx`**

```tsx
import { useState } from 'react'
import { useStore } from '../../store/use-store'
import { useSetSongs, useShownSong } from '../../hooks/use-shown-song'
import { setLength } from '../../music/setlist-text'
import { SetlistScreen } from '../setlist/SetlistScreen'
import { Sheet } from './Sheet'
import { SetSongList } from './SetSongList'

/**
 * Every setlist on the left, the tapped list's songs on the right. In the list
 * being played a tap goes to that song. In any other list a tap plays the song
 * once, as an extra, and Next then goes back to the song the player left;
 * "Play this whole list" switches the set instead. Only Practice edits lists.
 */
export function SetlistsSheet({ onStage, onClose }: { onStage: boolean; onClose: () => void }) {
  const lists = useStore(s => s.setlistData.lists)
  const activeId = useStore(s => s.setlistData.activeId)
  const currentIndex = useStore(s => s.currentIndex)
  const goToSong = useStore(s => s.goToSong)
  const playExtra = useStore(s => s.playExtra)
  const setActiveSetlist = useStore(s => s.setActiveSetlist)
  const { setSongs: playing, extraFrom } = useShownSong()
  const [chosenId, setChosenId] = useState(activeId)
  const [editing, setEditing] = useState(false)
  // A list deleted while the sheet is open falls back to the one being played
  const chosen = lists[chosenId] ? chosenId : activeId
  const songs = useSetSongs(chosen)
  const isPlaying = chosen === activeId
  const left = playing[currentIndex]
  const length = setLength(songs)

  return (
    <>
      <Sheet label="Setlists" onClose={onClose} className="setlists-sheet">
        <div className="lists-col">
          {Object.values(lists).map(item => (
            <button
              key={item.id}
              className="lists-item"
              aria-pressed={item.id === chosen}
              onClick={() => setChosenId(item.id)}
            >
              <span className="lists-name">{item.name}</span>
              <span className="lists-count">{item.songTitles.length} songs</span>
              {item.id === activeId && <span className="lists-tag">PLAYING NOW</span>}
            </button>
          ))}
        </div>

        <div className="lists-songs">
          <div className="sheet-head">
            <h2 className="sheet-title">{lists[chosen]?.name}</h2>
            <span className="sheet-sub">{songs.length} songs{length ? ` · about ${length}` : ''}</span>
            {isPlaying && !onStage && (
              <button className="sheet-action" onClick={() => setEditing(true)}>Edit list</button>
            )}
            {!isPlaying && songs.length > 0 && (
              <button
                className="sheet-action is-primary"
                onClick={() => {
                  setActiveSetlist(chosen)
                  onClose()
                }}
              >
                Play this whole list
              </button>
            )}
          </div>

          {songs.length === 0 ? (
            <p className="sheet-hint">This list is empty.</p>
          ) : isPlaying ? (
            <SetSongList
              songs={songs}
              currentIndex={extraFrom ? null : currentIndex}
              leftIndex={extraFrom ? currentIndex : null}
              onPick={i => {
                goToSong(i)
                onClose()
              }}
            />
          ) : (
            <>
              <p className="sheet-hint">
                {left
                  ? `Tap a song to play it as an extra. Next then reads Back to the set and takes you to ${left.title}.`
                  : 'Tap a song to play it as an extra.'}
              </p>
              <SetSongList
                songs={songs}
                currentIndex={null}
                leftIndex={null}
                onPick={i => {
                  playExtra(songs[i].title, chosen)
                  onClose()
                }}
              />
            </>
          )}
        </div>
      </Sheet>
      {editing && <SetlistScreen onClose={() => setEditing(false)} />}
    </>
  )
}
```

- [ ] **Step 4: Add the Setlists button to the bar.** In `app/src/components/layout/BottomBar.tsx`:
  - Add `import { SetlistsSheet } from '../sheets/SetlistsSheet'` under the `SongsSheet` import.
  - Put this button first inside `<nav>`, before the Songs button:

```tsx
        <button
          className="bb-btn"
          aria-label="Setlists"
          aria-expanded={open === 'setlists'}
          onClick={() => toggle('setlists')}
        >
          Setlists
        </button>
```

  - Under `{open === 'songs' && <SongsSheet onStage={onStage} onClose={close} />}` add:

```tsx
      {open === 'setlists' && <SetlistsSheet onStage={onStage} onClose={close} />}
```

- [ ] **Step 5: Update the bar order test.** In `app/src/tests/components/song-nav.test.tsx`, in "keeps getting around on the left", replace the expectation with:

```tsx
    expect(names.slice(0, 4)).toEqual(['Setlists', 'Songs, 1 of 21', 'Start of set', `Next song: ${G[1]}`])
```

- [ ] **Step 6: Append the Setlists sheet rules** to the end of `app/src/styles/sheets.css`

```css
/* Setlists sheet: the lists on the left, the tapped list's songs on the right */
.setlists-sheet { display: grid; grid-template-columns: minmax(170px, 1fr) 2.2fr; gap: 16px; align-items: start; }
.lists-col { display: grid; gap: 6px; position: sticky; top: 0; }
.lists-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
  text-align: left;
}
.lists-item[aria-pressed='true'] { border-color: var(--accent); box-shadow: inset 4px 0 0 var(--accent); }
.lists-name { font-weight: 700; }
.lists-count { color: var(--text-muted); font-size: 13px; }
.lists-tag { font-size: 11px; font-weight: 800; letter-spacing: 0.06em; color: var(--success); }
.lists-songs { min-width: 0; }
.sheet-action.is-primary { background: var(--accent); border-color: var(--accent); color: var(--bg); }

@media (max-width: 599px) {
  .setlists-sheet { grid-template-columns: 1fr; }
  .lists-col { position: static; }
}
```

- [ ] **Step 7: Run the new test, the bar test, the types and every test**

Run: `npx vitest run src/tests/components/setlists-sheet.test.tsx src/tests/components/song-nav.test.tsx && npx tsc -b --noEmit && npx vitest run`
Expected: `11 passed` and `18 passed`, no tsc output, then every test passes.

- [ ] **Step 8: Commit**

```bash
cd /Users/krys/Documents/coding/cheetsheetForGuitarPlaying && git status --short
git add app/src/components/sheets/SetlistsSheet.tsx app/src/components/layout/BottomBar.tsx app/src/styles/sheets.css app/src/tests/components/setlists-sheet.test.tsx app/src/tests/components/song-nav.test.tsx
git commit -m "feat: Setlists sheet on both screens, with an extra song from another list

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Notes, Finder and More from the bar

**Files:**
- Create: `app/src/hooks/use-backup.ts`, `app/src/components/sheets/NotesSheet.tsx`, `app/src/components/sheets/MoreSheet.tsx`
- Modify: `app/src/components/layout/BottomBar.tsx` (the screen's own buttons and their sheets)
- Modify: `app/src/styles/sheets.css` (append the Notes and More rules)
- Test: `app/src/tests/components/bar-sheets.test.tsx` (new); `app/src/tests/components/song-nav.test.tsx` (one new `describe`)

**Interfaces:**
- Consumes: `Sheet` and `SheetName` (Task 4); `useShownSong()` (Task 3); `exportAllData`, `importAllData`, `takeSnapshot` from `store/persistence`; `shareFile` from `utils/share`; `hasEditedChart` from `music/chart-edits`; `songChordsOf`, `capoFor` from `music/chart-view`; `ChordFinder({ songChords, capo, onClose })`; `RestoreModal({ onClose })`; `SavedChartsModal({ onClose })`; store actions `useBuiltInChart(title)`, `showToast(text)`, `restoreGigOrder()`, `setInstrument`, `toggleSimpleChords`, `setGuitar`, `toggleTheme`.
- Produces:
  - `useBackup(): { exportBackup(): Promise<void>; importBackup(file: File): Promise<void> }` in `hooks/use-backup.ts`. The backup is prepared when the hook mounts.
  - `NotesSheet({ onClose })`, a dialog named "Notes".
  - `MoreSheet({ onClose })`, a dialog named "More".
  - Bar buttons after the spacer: on Stage `Notes` (`aria-label="Notes"`), then `Switch to Practice`; on Practice `Chord Finder` (`aria-label="Chord Finder"`), `More` (`aria-label="More"`), then `Switch to Stage`.
  - CSS classes: `.notes-text`, `.more-group`, `.more-title`, `.more-item`, `.more-foot`.

TopBar still exists until Task 11, so its menu and these sheets both work for a while. That is expected.

- [ ] **Step 1: Write the failing test** at `app/src/tests/components/bar-sheets.test.tsx`

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { BottomBar } from '../../components/layout/BottomBar'
import { DEFAULT_SONGS, GIG_SETLIST_2026 as G } from '../../data/songs'
import { useStore } from '../../store/use-store'
import { APP_VERSION } from '../../version'

const faith = DEFAULT_SONGS.find(s => s.title === 'Faith')!
const mine = faith.sections.map((s, i) => (i === 1 ? { ...s, chords: 'B  A' } : s))

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})
afterEach(() => {
  vi.restoreAllMocks()
})

const button = (name: string | RegExp) => screen.getByRole('button', { name })
const more = () => screen.getByRole('dialog', { name: 'More' })
const openMore = () => fireEvent.click(button('More'))

describe('the Notes sheet, on Stage', () => {
  beforeEach(() => useStore.setState({ viewMode: 'stage' }))

  it("shows the song's notes", () => {
    render(<BottomBar />)
    fireEvent.click(button('Notes'))
    const sheet = screen.getByRole('dialog', { name: 'Notes' })
    expect(within(sheet).getByText(faith.notes)).toBeInTheDocument()
    expect(button('Notes').getAttribute('aria-expanded')).toBe('true')
  })

  it('shows your own notes over the built-in ones', () => {
    useStore.setState({ edits: { Faith: { notes: 'Watch the drummer' } } })
    render(<BottomBar />)
    fireEvent.click(button('Notes'))
    expect(within(screen.getByRole('dialog', { name: 'Notes' })).getByText('Watch the drummer')).toBeInTheDocument()
  })

  it('says so when a song has no notes', () => {
    useStore.setState({ edits: { Faith: { notes: '' } } })
    render(<BottomBar />)
    fireEvent.click(button('Notes'))
    expect(screen.getByText('No notes for this song.')).toBeInTheDocument()
  })

  it('shows the notes of an extra song', () => {
    useStore.getState().playExtra(G[20], 'default')
    render(<BottomBar />)
    fireEvent.click(button('Notes'))
    const song = DEFAULT_SONGS.find(s => s.title === G[20])!
    expect(within(screen.getByRole('dialog', { name: 'Notes' })).getByRole('heading', { name: song.title })).toBeInTheDocument()
  })
})

describe('the Chord Finder, on Practice', () => {
  it('opens from the bar and closes again', () => {
    render(<BottomBar />)
    fireEvent.click(button('Chord Finder'))
    expect(screen.getByRole('dialog', { name: 'Chord Finder' })).toBeInTheDocument()
    fireEvent.click(button('Close'))
    expect(screen.queryByRole('dialog', { name: 'Chord Finder' })).not.toBeInTheDocument()
  })
})

describe('the More sheet, on Practice', () => {
  it('has the three groups', () => {
    render(<BottomBar />)
    openMore()
    for (const name of ['This song', 'How charts look', 'Setlists and backups']) {
      expect(within(more()).getByRole('heading', { name })).toBeInTheDocument()
    }
  })

  it('takes this song back to its original chart, after asking', () => {
    const ask = vi.spyOn(window, 'confirm').mockReturnValue(true)
    useStore.setState({ edits: { Faith: { sections: mine } } })
    render(<BottomBar />)
    openMore()
    fireEvent.click(within(more()).getByRole('button', { name: 'Back to the original chart' }))
    expect(ask).toHaveBeenCalledWith(expect.stringContaining('Earlier versions'))
    expect(useStore.getState().edits['Faith']).toBeUndefined()
    expect(useStore.getState().toast).toBe('Faith shows the original chart')
  })

  it('cannot take back a song that already shows the original chart', () => {
    render(<BottomBar />)
    openMore()
    expect(within(more()).getByRole('button', { name: 'Back to the original chart' })).toBeDisabled()
  })

  it('flips the instrument, and has nothing about guitars for the keyboard', () => {
    render(<BottomBar />)
    openMore()
    fireEvent.click(within(more()).getByRole('button', { name: 'Instrument: guitar' }))
    expect(useStore.getState().instrument).toBe('keyboard')
    expect(within(more()).getByRole('button', { name: 'Instrument: keyboard' })).toBeInTheDocument()
    expect(within(more()).queryByRole('button', { name: /^Guitar: / })).toBeNull()
  })

  it('simplifies chords', () => {
    render(<BottomBar />)
    openMore()
    const simple = within(more()).getByRole('button', { name: 'Simplify chords' })
    expect(simple.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(simple)
    expect(useStore.getState().simpleChords).toBe(true)
    expect(simple.getAttribute('aria-pressed')).toBe('true')
  })

  it('sets the guitar for every song', () => {
    render(<BottomBar />)
    openMore()
    fireEvent.click(within(more()).getByRole('button', { name: 'Guitar: each song its own' }))
    expect(useStore.getState().guitar).toBe('electric')
  })

  it('switches to the light theme', () => {
    render(<BottomBar />)
    openMore()
    fireEvent.click(within(more()).getByRole('button', { name: 'Light theme' }))
    expect(useStore.getState().theme).toBe('light')
  })

  it('counts the songs with chords of their own, and opens them', () => {
    useStore.setState({ edits: { Faith: { sections: mine } } })
    render(<BottomBar />)
    openMore()
    fireEvent.click(within(more()).getByRole('button', { name: 'Back to all the original charts (1)' }))
    expect(screen.getByRole('dialog', { name: 'Back to the original charts' })).toBeInTheDocument()
  })

  it('has no number when every song shows its built-in chart', () => {
    render(<BottomBar />)
    openMore()
    expect(within(more()).getByRole('button', { name: 'Back to all the original charts' })).toBeInTheDocument()
  })

  it('restores the GM Tribute order after asking', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const restore = vi.fn()
    useStore.setState({ restoreGigOrder: restore })
    render(<BottomBar />)
    openMore()
    fireEvent.click(within(more()).getByRole('button', { name: 'Restore the GM Tribute order' }))
    expect(restore).toHaveBeenCalled()
  })

  it('has the backups and the version line, naming this copy of the app', () => {
    render(<BottomBar />)
    openMore()
    for (const name of ['Export a backup', 'Import a backup', 'Restore a backup…']) {
      expect(within(more()).getByRole('button', { name })).toBeInTheDocument()
    }
    expect(within(more()).getByText(new RegExp(`PlayBook v${APP_VERSION.replace(/\./g, '\\.')}`))).toHaveTextContent('browser copy')
  })
})
```

- [ ] **Step 2: Add the right side of the bar to the bar test.** At the end of `app/src/tests/components/song-nav.test.tsx` add:

```tsx
describe('the right side of the bar', () => {
  const names = () => within(bar()).getAllByRole('button').map(b => b.getAttribute('aria-label'))

  it('on Stage: Notes, then the way to Practice', () => {
    useStore.setState({ viewMode: 'stage' })
    render(<BottomBar />)
    expect(names().slice(4)).toEqual(['Notes', 'Switch to Practice'])
  })

  it('on Practice: the Finder, More, then the way to Stage', () => {
    render(<BottomBar />)
    expect(names().slice(4)).toEqual(['Chord Finder', 'More', 'Switch to Stage'])
  })
})
```

- [ ] **Step 3: Run both and watch them fail**

Run: `npx vitest run src/tests/components/bar-sheets.test.tsx src/tests/components/song-nav.test.tsx`
Expected: FAIL. `Unable to find an accessible element with the role "button" and name "Notes"` (and "More", "Chord Finder"); the two new song-nav tests fail on the names after the fourth button.

- [ ] **Step 4: Write `app/src/hooks/use-backup.ts`**

```ts
import { useEffect, useRef } from 'react'
import { useStore } from '../store/use-store'
import { exportAllData, importAllData, takeSnapshot } from '../store/persistence'
import { shareFile } from '../utils/share'

/**
 * Saving and loading a backup file. iOS only opens the share sheet straight
 * from a tap, so the backup is prepared when the hook mounts (the More sheet
 * opening) and is ready the moment Export is tapped.
 */
export function useBackup() {
  const hydrate = useStore(s => s.hydrate)
  const showToast = useStore(s => s.showToast)
  const prepared = useRef<string | null>(null)

  useEffect(() => {
    exportAllData().then(json => { prepared.current = json }).catch(() => {})
  }, [])

  const exportBackup = async () => {
    try {
      const json = prepared.current ?? (await exportAllData())
      const name = `playbook-backup-${new Date().toISOString().slice(0, 10)}.json`
      const outcome = await shareFile(new File([json], name, { type: 'application/json' }))
      if (outcome === 'downloaded') showToast('Backup downloaded')
    } catch {
      showToast('Could not create the backup')
    }
  }

  const importBackup = async (file: File) => {
    try {
      const json = await file.text()
      // Importing replaces everything, so keep a way back first.
      await takeSnapshot('before import')
      await importAllData(json)
      await hydrate()
      alert('Data imported successfully. Page will reload.')
      location.reload()
    } catch (err) {
      alert('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  return { exportBackup, importBackup }
}
```

- [ ] **Step 5: Write `app/src/components/sheets/NotesSheet.tsx`**

```tsx
import { useStore } from '../../store/use-store'
import { useShownSong } from '../../hooks/use-shown-song'
import { Sheet } from './Sheet'

/** The song's notes: kept off the Stage chart, one tap away. */
export function NotesSheet({ onClose }: { onClose: () => void }) {
  const { song } = useShownSong()
  const edits = useStore(s => s.edits)
  const notes = song ? (edits[song.title]?.notes ?? song.notes ?? '') : ''

  return (
    <Sheet label="Notes" onClose={onClose} className="notes-sheet">
      <div className="sheet-head">
        <h2 className="sheet-title">{song ? song.title : 'Notes'}</h2>
      </div>
      {notes ? <p className="notes-text">{notes}</p> : <p className="sheet-hint">No notes for this song.</p>}
    </Sheet>
  )
}
```

- [ ] **Step 6: Write `app/src/components/sheets/MoreSheet.tsx`**

```tsx
import { useRef, useState } from 'react'
import { useStore } from '../../store/use-store'
import { useShownSong } from '../../hooks/use-shown-song'
import { useBackup } from '../../hooks/use-backup'
import { hasEditedChart } from '../../music/chart-edits'
import { APP_VERSION, BUILD_TIME } from '../../version'
import { RestoreModal } from '../shared/RestoreModal'
import { SavedChartsModal } from '../edit/SavedChartsModal'
import { Sheet } from './Sheet'

/**
 * On an iPad the home-screen app and Safari are two copies of PlayBook, each
 * with its own saved charts. Saying which one this is stops them being mixed up.
 */
function copyName(): string {
  const installed =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia?.('(display-mode: standalone)')?.matches === true
  return installed ? 'home-screen app' : 'browser copy'
}

/** The app's settings, on Practice only. The one thing about a single song is going back to its original chart. */
export function MoreSheet({ onClose }: { onClose: () => void }) {
  const { song } = useShownSong()
  const edits = useStore(s => s.edits)
  const instrument = useStore(s => s.instrument)
  const setInstrument = useStore(s => s.setInstrument)
  const simpleChords = useStore(s => s.simpleChords)
  const toggleSimpleChords = useStore(s => s.toggleSimpleChords)
  const guitar = useStore(s => s.guitar)
  const setGuitar = useStore(s => s.setGuitar)
  const theme = useStore(s => s.theme)
  const toggleTheme = useStore(s => s.toggleTheme)
  const restoreGigOrder = useStore(s => s.restoreGigOrder)
  const useBuiltInChart = useStore(s => s.useBuiltInChart)
  const showToast = useStore(s => s.showToast)
  // Songs that show chords saved on this device instead of the built-in chart
  const savedCharts = useStore(s => s.allSongs().filter(one => hasEditedChart(one, s.edits[one.title])).length)
  const { exportBackup, importBackup } = useBackup()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dialog, setDialog] = useState<'restore' | 'saved' | null>(null)

  const edited = !!song && hasEditedChart(song, edits[song.title])
  const backToOriginal = () => {
    if (!song) return
    if (!confirm(`Go back to the original chart for "${song.title}"?\n\nYour chords are kept under Earlier versions (Edit, at the bottom of the chart).`)) return
    useBuiltInChart(song.title)
    showToast(`${song.title} shows the original chart`)
  }

  return (
    <>
      <Sheet label="More" onClose={onClose} className="more-sheet">
        <section className="more-group">
          <h3 className="more-title">This song</h3>
          <button className="more-item" disabled={!edited} onClick={backToOriginal}>Back to the original chart</button>
        </section>

        <section className="more-group">
          <h3 className="more-title">How charts look</h3>
          {/* Who is reading: the keyboard player gets chords as they sound, and nothing about guitars */}
          <button className="more-item" onClick={() => setInstrument(instrument === 'guitar' ? 'keyboard' : 'guitar')}>
            Instrument: {instrument}
          </button>
          <button className="more-item" aria-pressed={simpleChords} onClick={toggleSimpleChords}>Simplify chords</button>
          {/* Each song's own guitar, then electric for all, then acoustic for all */}
          {instrument === 'guitar' && (
            <button
              className="more-item"
              onClick={() => setGuitar(guitar === 'auto' ? 'electric' : guitar === 'electric' ? 'acoustic' : 'auto')}
            >
              {guitar === 'auto'
                ? 'Guitar: each song its own'
                : guitar === 'electric' ? 'Guitar: electric for all songs' : 'Guitar: acoustic for all songs'}
            </button>
          )}
          <button className="more-item" aria-pressed={theme === 'light'} onClick={toggleTheme}>Light theme</button>
        </section>

        <section className="more-group">
          <h3 className="more-title">Setlists and backups</h3>
          <button
            className="more-item"
            onClick={() => {
              if (confirm('Rebuild this setlist as the printed GM Tribute running order? A restore point is saved first.')) restoreGigOrder()
            }}
          >
            Restore the GM Tribute order
          </button>
          <button className="more-item" onClick={exportBackup}>Export a backup</button>
          <button className="more-item" onClick={() => fileInputRef.current?.click()}>Import a backup</button>
          <button className="more-item" onClick={() => setDialog('restore')}>Restore a backup&hellip;</button>
          <button className="more-item" onClick={() => setDialog('saved')}>
            Back to all the original charts{savedCharts > 0 ? ` (${savedCharts})` : ''}
          </button>
        </section>

        <p className="more-foot">
          PlayBook v{APP_VERSION} &middot; {copyName()} &middot; built {BUILD_TIME.slice(0, 16).replace('T', ' ')}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) importBackup(file)
            e.target.value = ''
          }}
        />
      </Sheet>
      {/* Over the sheet, which stays open beneath them */}
      {dialog === 'restore' && <RestoreModal onClose={() => setDialog(null)} />}
      {dialog === 'saved' && <SavedChartsModal onClose={() => setDialog(null)} />}
    </>
  )
}
```

- [ ] **Step 7: Add the screen's own buttons to `app/src/components/layout/BottomBar.tsx`**
  - Add these imports under the `SetlistsSheet` import:

```tsx
import { useChartView } from '../../store/use-store'
import { capoFor, songChordsOf } from '../../music/chart-view'
import { NotesSheet } from '../sheets/NotesSheet'
import { MoreSheet } from '../sheets/MoreSheet'
import { ChordFinder } from '../finder/ChordFinder'
```

  (`useChartView` joins the existing `useStore` import from `'../../store/use-store'` rather than adding a second import line.)
  - Change `const { previous, next, returning, setSongs } = useShownSong()` to `const { song, previous, next, returning, setSongs } = useShownSong()`, and under it add `const view = useChartView()`.
  - Replace the whole `{onStage ? ( ... ) : ( ... )}` block after `<span className="bb-spacer" />` with:

```tsx
        {onStage ? (
          <>
            <button className="bb-btn" aria-label="Notes" aria-expanded={open === 'notes'} onClick={() => toggle('notes')}>
              Notes
            </button>
            <button className="bb-btn" aria-label="Switch to Practice" onClick={() => { close(); toggleViewMode() }}>
              Practice
            </button>
          </>
        ) : (
          <>
            <button className="bb-btn" aria-label="Chord Finder" aria-expanded={open === 'finder'} onClick={() => toggle('finder')}>
              Finder
            </button>
            <button className="bb-btn" aria-label="More" aria-expanded={open === 'more'} onClick={() => toggle('more')}>
              More
            </button>
            <button className="bb-btn" aria-label="Switch to Stage" onClick={() => { close(); toggleViewMode() }}>
              Stage
            </button>
          </>
        )}
```

  - Under `{open === 'setlists' && <SetlistsSheet onStage={onStage} onClose={close} />}` add:

```tsx
      {open === 'notes' && onStage && <NotesSheet onClose={close} />}
      {open === 'more' && !onStage && <MoreSheet onClose={close} />}
      {open === 'finder' && !onStage && (
        <ChordFinder
          songChords={song ? songChordsOf(song, edits[song.title], view) : []}
          capo={song ? capoFor(song, edits[song.title], view) : 0}
          onClose={close}
        />
      )}
```

- [ ] **Step 8: Append the Notes and More rules** to the end of `app/src/styles/sheets.css`

```css
/* ---------- Notes (Stage) and More (Practice) ---------- */
.notes-text { margin: 0; font-size: 17px; line-height: 1.5; white-space: pre-wrap; }
.more-group { display: grid; gap: 6px; margin-bottom: 16px; }
.more-title { margin: 0 0 2px; color: var(--text-muted); font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
.more-item {
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
  font-size: 15px;
  text-align: left;
}
.more-item:disabled { opacity: 0.4; }
.more-item[aria-pressed='true'] { border-color: var(--accent); color: var(--accent); }
.more-foot { margin: 8px 0 0; color: var(--text-muted); font-size: 12px; }
```

- [ ] **Step 9: Run the new tests, the types and every test**

Run: `npx vitest run src/tests/components/bar-sheets.test.tsx src/tests/components/song-nav.test.tsx && npx tsc -b --noEmit && npx vitest run`
Expected: `16 passed` and `20 passed`, no tsc output, then every test passes.

- [ ] **Step 10: Commit**

```bash
cd /Users/krys/Documents/coding/cheetsheetForGuitarPlaying && git status --short
git add app/src/hooks/use-backup.ts app/src/components/sheets/NotesSheet.tsx app/src/components/sheets/MoreSheet.tsx app/src/components/layout/BottomBar.tsx app/src/styles/sheets.css app/src/tests/components/bar-sheets.test.tsx app/src/tests/components/song-nav.test.tsx
git commit -m "feat: Notes on Stage, Finder and More on Practice, from the bar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: One chart for both screens

A refactor with one change people can see: the chart follows the shown song, so an extra song now shows on the chart (Tasks 2 to 5 already move to it). Everything else on screen stays as it is, and every existing SongSheet test must still pass unchanged.

**Files:**
- Create: `app/src/hooks/use-song-chart.ts`, `app/src/hooks/use-chart-fit.ts`, `app/src/components/song/ChartBody.tsx`, `app/src/components/song/EmptyList.tsx`
- Modify (rewrite): `app/src/components/song/SongSheet.tsx`
- Test: `app/src/tests/components/song-chart.test.tsx` (new)

**Interfaces:**
- Consumes: `useShownSong()` (Task 3); `useBandPositions`, `BandPlan` from `hooks/use-band-positions`; `useFitText` from `hooks/use-fit-text`; `BandChart`; the chart helpers in `music/`.
- Produces:
  - In `hooks/use-song-chart.ts`: `interface SongChart` (fields below) and `useSongChart(song: Song | undefined): SongChart | null`.
    - `song: Song`, `songEdits: SongEdits | undefined`
    - `sections: Section[]` (stored, the song's own pitch), `displaySections: Section[]` (the shapes' pitch, what the editor shows), `readSections: Section[]` (as read: one part per line, plain if asked)
    - `bands: boolean`, `notes: string`, `form: string[]`, `showForm: boolean` (every step of the order is a part of the chart), `letters: Map<string, string> | undefined` (only for a chart in bands)
    - `keyboard: boolean`, `semitones: number`, `capo: number`, `shift: number`, `sourceKey: string`
    - `playedKey: string` (the key the band plays), `shapesKey: string` (the key of the shapes played, the capo taken off)
    - `lowerKey: boolean` (the band plays it lower and no transpose is set), `bpm: number`, `edited: boolean` (`hasEditedChart`)
    - `span: BandPlan['span']`, `band: Record<string, number>` (the recommended shape per chord)
    - `fitKey: string` (changes whenever what is drawn changes)
  - In `hooks/use-chart-fit.ts`: `useChartFit(scrollRef, fitRef, sectionsRef, fitKey: string, { bands: boolean, enabled: boolean }): void`. Today's sizes; Task 12 replaces the band branch.
  - In `components/song/ChartBody.tsx`: `ChartBody({ chart: SongChart, onChord?: (chord: string) => void, picked?: string | null, focus?: { index: number | null; onFocus: (index: number | null) => void }, sectionsRef?: Ref<HTMLDivElement> })`. It renders `div.chart-sections`. With no `onChord` no chord reacts to a tap; with no `focus` the part names are plain.
  - `EmptyList()`: what shows when the playing list is empty.

- [ ] **Step 1: Write the failing test** at `app/src/tests/components/song-chart.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, renderHook, screen, act } from '@testing-library/react'
import { SongSheet } from '../../components/song/SongSheet'
import { ChartBody } from '../../components/song/ChartBody'
import { useSongChart } from '../../hooks/use-song-chart'
import { DEFAULT_SONGS, GIG_SETLIST_2026 as G } from '../../data/songs'
import { useStore } from '../../store/use-store'

const song = (title: string) => DEFAULT_SONGS.find(s => s.title === title)!

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})

describe('the chart on screen', () => {
  it('shows an extra song, and the set song again after it', () => {
    render(<SongSheet />)
    act(() => useStore.getState().playExtra(G[20], 'default'))
    expect(screen.getByRole('heading', { name: G[20] })).toBeInTheDocument()
    act(() => useStore.getState().nextSong())
    expect(screen.getByRole('heading', { name: G[0] })).toBeInTheDocument()
  })

  it('says how to get out of an empty list', () => {
    useStore.setState({ setlistData: { activeId: 'empty', lists: { empty: { id: 'empty', name: 'Spare', songTitles: [] } } } })
    render(<SongSheet />)
    expect(screen.getByText(/is empty/)).toHaveTextContent('“Spare” is empty.')
    expect(screen.getByRole('button', { name: 'Load GM Tribute running order' })).toBeInTheDocument()
  })
})

describe('useSongChart', () => {
  it('is null with no song', () => {
    const { result } = renderHook(() => useSongChart(undefined))
    expect(result.current).toBeNull()
  })

  it('knows the key played and the shapes under a capo', () => {
    useStore.getState().setCapo('Faith', 2)
    const { result } = renderHook(() => useSongChart(song('Faith')))
    expect(result.current!.playedKey).toBe('B')
    expect(result.current!.capo).toBe(2)
    expect(result.current!.shapesKey).toBe('A')
    expect(result.current!.bands).toBe(true)
    expect(result.current!.showForm).toBe(true)
  })

  it('flags a song the band plays lower only while no transpose is set', () => {
    const imYourMan = song("I'm Your Man")
    const { result, rerender } = renderHook(() => useSongChart(imYourMan))
    expect(result.current!.lowerKey).toBe(false) // the band key ships with the song
    act(() => useStore.getState().setTranspose(imYourMan.title, 0))
    rerender()
    expect(result.current!.lowerKey).toBe(true)
  })

  it('knows a chart that has your own chords', () => {
    const faith = song('Faith')
    useStore.setState({ edits: { Faith: { sections: faith.sections.map((s, i) => (i === 1 ? { ...s, chords: 'B  A' } : s)) } } })
    const { result } = renderHook(() => useSongChart(faith))
    expect(result.current!.edited).toBe(true)
  })
})

describe('ChartBody', () => {
  function Body({ tappable }: { tappable: boolean }) {
    const chart = useSongChart(song('Faith'))!
    return <ChartBody chart={chart} onChord={tappable ? () => {} : undefined} />
  }

  it('has no chord that reacts to a tap when no tap is asked for', () => {
    const { container } = render(<Body tappable={false} />)
    expect(container.querySelector('.chart-sections')).not.toBeNull()
    expect(container.querySelector('.chart-chord-tap')).toBeNull()
    expect(container.querySelector('.chart-label-btn')).toBeNull()
  })

  it('marks the chords that have shapes when a tap is asked for', () => {
    const { container } = render(<Body tappable />)
    expect(container.querySelectorAll('.chart-chord-tap').length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/tests/components/song-chart.test.tsx`
Expected: FAIL. `Failed to resolve import "../../components/song/ChartBody"`.

- [ ] **Step 3: Write `app/src/hooks/use-song-chart.ts`**

```ts
import { useMemo } from 'react'
import { useChartView, useStore } from '../store/use-store'
import { capoFor, shapeKey, shapeSections, shapeShift, simplifyRuleFor, simplifyText } from '../music/chart-view'
import { hasBars } from '../music/bars'
import { formMatches } from '../music/form'
import { letterByName } from '../music/letters'
import { layOutParts } from '../music/phrases'
import { hasEditedChart } from '../music/chart-edits'
import { playedKey, transposeFor } from '../music/setlist-text'
import { useBandPositions, type BandPlan } from './use-band-positions'
import type { Section, Song, SongEdits } from '../types'

/** Everything a screen draws from one song, worked out once. */
export interface SongChart {
  song: Song
  songEdits: SongEdits | undefined
  /** The stored chart, at the song's own pitch. */
  sections: Section[]
  /** At the shapes' pitch: what the editor shows and writes back through. */
  displaySections: Section[]
  /** As read: each part of a section on a line of its own, plain if the player asked. Never edited. */
  readSections: Section[]
  /** Written in bars, so drawn in bands. */
  bands: boolean
  notes: string
  form: string[]
  /** The order is shown only when every step is a part of the chart. */
  showForm: boolean
  /** Each part's letter, for a chart in bands. */
  letters: Map<string, string> | undefined
  /** The keyboard player reads every chord as it sounds: no capo, no shapes, no guitar sound. */
  keyboard: boolean
  semitones: number
  capo: number
  /** From the stored chart to the shapes played: the band's key, less the capo. */
  shift: number
  sourceKey: string
  /** The key the band plays it in. */
  playedKey: string
  /** The key of the shapes played: the played key with the capo taken off. */
  shapesKey: string
  /** The band plays it lower and no transpose is set yet. */
  lowerKey: boolean
  bpm: number
  /** The chart shows the player's own chords. */
  edited: boolean
  span: BandPlan['span']
  /** The recommended shape for each chord. */
  band: Record<string, number>
  /** Changes whenever what is drawn changes. */
  fitKey: string
}

export function useSongChart(song: Song | undefined): SongChart | null {
  const edits = useStore(s => s.edits)
  const view = useChartView()
  const songEdits = song ? edits[song.title] : undefined
  const { picks: band, span } = useBandPositions(song, songEdits)
  const rule = simplifyRuleFor(song, songEdits, view)

  return useMemo(() => {
    if (!song) return null
    const displaySections = shapeSections(song, songEdits, view)
    // The parts are found before the chords are made plain, so plain and full
    // charts break their lines in the same places.
    const laidOut = displaySections.map(sec => ({ ...sec, chords: layOutParts(sec.chords) }))
    const readSections = view.simple ? laidOut.map(sec => ({ ...sec, chords: simplifyText(sec.chords, rule) })) : laidOut
    const bands = readSections.some(s => s.chords.split('\n').some(line => hasBars(line)))
    const form = songEdits?.form ?? song.form ?? []
    const semitones = transposeFor(song, songEdits)
    const capo = capoFor(song, songEdits, view)
    const keyboard = view.instrument === 'keyboard'
    const played = playedKey(song, songEdits).key
    return {
      song,
      songEdits,
      sections: songEdits?.sections ?? song.sections ?? [],
      displaySections,
      readSections,
      bands,
      notes: songEdits?.notes ?? song.notes ?? '',
      form,
      showForm: formMatches(form, readSections),
      letters: bands ? letterByName(readSections.map(s => s.name)) : undefined,
      keyboard,
      semitones,
      capo,
      shift: shapeShift(song, songEdits, view),
      sourceKey: songEdits?.key ?? song.key ?? '',
      playedKey: played,
      shapesKey: shapeKey(played, -capo),
      lowerKey: !!song.lowerKey && semitones === 0,
      bpm: songEdits?.bpm ?? song.bpm,
      edited: hasEditedChart(song, songEdits),
      span,
      band,
      fitKey: JSON.stringify([song.title, readSections, form, keyboard, capo]),
    }
  }, [song, songEdits, view, rule, band, span])
}
```

- [ ] **Step 4: Write `app/src/hooks/use-chart-fit.ts`** (today's sizes, moved out of SongSheet unchanged)

```ts
import type { RefObject } from 'react'
import { useFitText } from './use-fit-text'

/** Chart text never goes below this — it scrolls instead. */
const MIN_CHART_PX = 20
/** Upper bound so a two-chord song does not become a wall of letters. */
const MAX_CHART_PX = 64
/** Keep progressions on one line if that still gives at least this size. */
const NO_WRAP_MIN_PX = 30
/** A chart in bands, in portrait: used where the stylesheet sets none (bands.css sets them per screen shape). */
const BAND_BASE_PX = 32
const BAND_MIN_PX = 28
const BAND_MAX_PX = 45

/** Fits the chart to its screen: the biggest text that needs no scrolling. */
export function useChartFit(
  scrollRef: RefObject<HTMLElement | null>,
  fitRef: RefObject<HTMLElement | null>,
  sectionsRef: RefObject<HTMLElement | null>,
  fitKey: string,
  { bands, enabled }: { bands: boolean; enabled: boolean },
): void {
  useFitText(scrollRef, fitRef, fitKey, {
    // A chart in bands takes its range from bands.css, and when not even its
    // bands fit it goes back to the base size and scrolls. A chord too wide
    // for its bar shrinks in that bar alone.
    ...(bands
      ? { min: BAND_MIN_PX, max: BAND_MAX_PX, fallback: BAND_BASE_PX, cssVars: true, cramped: false, fitCells: '.bar' }
      : { min: MIN_CHART_PX, max: MAX_CHART_PX, preferNoWrapMin: NO_WRAP_MIN_PX }),
    enabled,
    // A long chart keeps its chords on screen; anything under them can scroll
    essentialRef: sectionsRef,
  })
}
```

- [ ] **Step 5: Write `app/src/components/song/ChartBody.tsx`**

```tsx
import { Fragment, type Ref } from 'react'
import { isChartMark, sectionColor } from '../../music/theory'
import { hasShapes } from '../../music/voicings'
import { splitAlteration } from '../../music/chord-text'
import type { SongChart } from '../../hooks/use-song-chart'
import { BandChart } from './BandChart'

interface Props {
  chart: SongChart
  /** Practice: a chord with shapes reacts to a tap. Absent on Stage, where nothing on the chart does. */
  onChord?: (chord: string) => void
  /** The chord picked, drawn as picked. */
  picked?: string | null
  /** Practice: a part's name picks the part, to see just its shapes. */
  focus?: { index: number | null; onFocus: (index: number | null) => void }
  sectionsRef?: Ref<HTMLDivElement>
}

/** The chart's parts and chords: the same on both screens, only what reacts to a tap differs. */
export function ChartBody({ chart, onChord, picked = null, focus, sectionsRef }: Props) {
  const { readSections, bands, keyboard, song } = chart
  const focusable = !!focus && !keyboard

  // In bands, a chord's alteration in brackets is drawn a little smaller: Bb7(b9).
  // The tap still picks the whole chord.
  const chordText = (token: string) => {
    const parts = bands ? splitAlteration(token) : null
    return parts ? <>{parts[0]}<span className="chord-alt">{parts[1]}</span></> : token
  }

  const renderTokens = (text: string) =>
    text.split(/(\s+)/).map((token, i) => {
      if (!token.trim()) return <span key={i}>{token}</span>
      if (isChartMark(token)) return <span key={i} className="chart-mark">{token}</span>
      if (!onChord || keyboard || !hasShapes(token)) return <span key={i}>{chordText(token)}</span>
      return (
        <span
          key={i}
          className={token === picked ? 'chart-chord-tap is-picked' : 'chart-chord-tap'}
          onClick={e => {
            e.stopPropagation()
            onChord(token)
          }}
        >
          {chordText(token)}
        </span>
      )
    })

  // Each line is one part. A line too long for the screen goes on indented,
  // so where it wraps never looks like the next part starting. The line break
  // stays in the text, for anything that reads the chart as text.
  const renderChords = (text: string) => {
    const lines = text.split('\n')
    return lines.map((line, li) => (
      <div key={li} className="chart-line">
        {renderTokens(line)}
        {li < lines.length - 1 && '\n'}
      </div>
    ))
  }

  return (
    <div ref={sectionsRef} className="chart-sections">
      {bands ? (
        <BandChart
          sections={readSections}
          focusable={focusable}
          focusedIndex={focus?.index ?? null}
          onFocus={focus?.onFocus ?? (() => {})}
          renderTokens={renderTokens}
        />
      ) : (
        readSections.map((section, i) => {
          const focused = focus?.index === i
          return (
            <Fragment key={`${song.title}-${i}`}>
              {focusable ? (
                // Tap a section to see just its chord shapes
                <button
                  type="button"
                  className={focused ? 'chart-label chart-label-btn is-focused' : 'chart-label chart-label-btn'}
                  style={{ color: sectionColor(section.name) }}
                  aria-pressed={focused}
                  onClick={() => focus!.onFocus(focused ? null : i)}
                >
                  {section.name}
                </button>
              ) : (
                <div className="chart-label" style={{ color: sectionColor(section.name) }}>
                  {section.name}
                </div>
              )}
              <div className="chart-chords">{renderChords(section.chords)}</div>
            </Fragment>
          )
        })
      )}
    </div>
  )
}
```

- [ ] **Step 6: Write `app/src/components/song/EmptyList.tsx`**

```tsx
import { useStore } from '../../store/use-store'

/**
 * An empty setlist is a normal state, not an error, but the player must not
 * be left staring at a blank screen with nothing to tap.
 */
export function EmptyList() {
  const listName = useStore(s => s.setlistData.lists[s.setlistData.activeId]?.name ?? 'this setlist')
  const restoreGigOrder = useStore(s => s.restoreGigOrder)
  return (
    <div className="chart-empty">
      <div>&ldquo;{listName}&rdquo; is empty.</div>
      <div style={{ fontSize: 14 }}>
        Your other setlists are safe — open <strong>Setlists</strong> in the bar below to switch.
      </div>
      <button
        onClick={() => {
          if (confirm(`Fill "${listName}" with the GM Tribute running order?`)) restoreGigOrder()
        }}
        className="tb-btn is-active"
        style={{ minHeight: 48, padding: '0 20px', fontSize: 16 }}
      >
        Load GM Tribute running order
      </button>
    </div>
  )
}
```

- [ ] **Step 7: Rewrite `app/src/components/song/SongSheet.tsx`.** Same screen as before; the song comes from `useShownSong()` and the chart from `useSongChart`.

```tsx
import { useLayoutEffect, useRef, useState } from 'react'
import { useStore } from '../../store/use-store'
import { shapesShown } from '../../store/view-settings'
import { keySpelling, shouldUseFlats, transposeText } from '../../music/theory'
import { normalizeChordText } from '../../music/chord-text'
import { positionLabel, shapeChoice } from '../../hooks/use-band-positions'
import { clearSongShape, pickSongShape } from '../../store/song-shapes'
import { useShownSong } from '../../hooks/use-shown-song'
import { useSongChart, type SongChart } from '../../hooks/use-song-chart'
import { useChartFit } from '../../hooks/use-chart-fit'
import { useSwipe } from '../../hooks/use-swipe'
import { VoicingPicker } from '../diagrams/VoicingPicker'
import { MoveChordsSheet } from './MoveChordsSheet'
import { ChartEditor } from '../edit/ChartEditor'
import { FormStrip } from './FormStrip'
import { ChartBody } from './ChartBody'
import { EmptyList } from './EmptyList'
import type { Song } from '../../types'

export function SongSheet() {
  const { song } = useShownSong()
  const chart = useSongChart(song)
  const editMode = useStore(s => s.editMode)
  const onStage = useStore(s => s.viewMode === 'stage')
  const diagramsVisible = useStore(shapesShown)
  const focusSection = useStore(s => s.focusSection)
  const setFocusSection = useStore(s => s.setFocusSection)
  const selectedVoicings = useStore(s => s.selectedVoicings)
  const clearVoicing = useStore(s => s.clearVoicing)
  const saveSections = useStore(s => s.saveSections)
  const saveNotes = useStore(s => s.saveNotes)
  const saveForm = useStore(s => s.saveForm)
  const useBuiltInChart = useStore(s => s.useBuiltInChart)
  const showToast = useStore(s => s.showToast)
  const nextSong = useStore(s => s.nextSong)
  const prevSong = useStore(s => s.prevSong)

  const [pickerChord, setPickerChord] = useState<string | null>(null)
  const [movingChords, setMovingChords] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const fitRef = useRef<HTMLDivElement>(null)
  const sectionsRef = useRef<HTMLDivElement>(null)

  // A chart with the player's own chords says so, and one tap goes back to the
  // original. Not on stage, where nothing on the chart should change.
  const edited = !!chart && !editMode && !onStage && chart.edited

  const fitKey = chart
    ? JSON.stringify([chart.fitKey, chart.notes, chart.song.cue ?? '', chart.lowerKey, edited, onStage])
    : ''
  useChartFit(scrollRef, fitRef, sectionsRef, fitKey, { bands: chart?.bands ?? false, enabled: !!chart && !editMode })

  // Every song opens at its top, not as far down as the last one was scrolled
  const songTitle = song?.title
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [songTitle])

  // Swipe only on the chart itself, never while editing.
  useSwipe(scrollRef, { onSwipeLeft: nextSong, onSwipeRight: prevSong }, !editMode)

  if (!chart) {
    return (
      <div ref={scrollRef} className="chart-scroll">
        <EmptyList />
      </div>
    )
  }

  const goBackToOriginal = (song: Song) => {
    if (!confirm(`Go back to the original chart for "${song.title}"?\n\nYour chords are kept under Earlier versions (Edit, at the bottom of the chart).`)) return
    useBuiltInChart(song.title)
    showToast(`${song.title} shows the original chart`)
  }

  // The reverse move, so an edit keeps the chart's own spelling (Bb7 in D is Cb7 in Eb)
  const toSourcePitch = (text: string) => {
    if (!chart.shift) return text
    const { letterShift } = keySpelling(chart.sourceKey, chart.shift)
    return transposeText(text, -chart.shift, shouldUseFlats(chart.sourceKey, 0), letterShift === undefined ? undefined : -letterShift)
  }

  // Chord edits arrive as shown on screen and are stored at the song's own pitch.
  const updateChordsAt = (index: number, chords: string) => {
    // Tidy first: Return is a line break, never a join, and stray spaces go
    const atSource = toSourcePitch(normalizeChordText(chords))
    saveSections(chart.song.title, chart.sections.map((sec, i) => (i === index ? { ...sec, chords: atSource } : sec)))
  }

  // The title line, the same on the stage chart and while editing
  const renderHeading = ({ song, keyboard, span, songEdits }: SongChart) => (
    <div className="chart-head">
      <h1 className="chart-title">{song.title}</h1>
      {/* The GX-10 sound and the neck position are the guitarist's: the keyboard has neither */}
      {song.preset && !keyboard && (
        <span
          className="chart-preset"
          aria-label={`GX-10 sound: ${song.preset.name}${song.preset.solo ? `, ${song.preset.solo} for the solo` : ''}`}
        >
          {song.preset.name}
          {song.preset.solo && ` → ${song.preset.solo} solo`}
        </span>
      )}
      {span && !keyboard && (() => {
        // The song's area of the neck. Tap it to move every chord, except on stage
        const moved = songEdits?.neck !== undefined
        const where = `${moved ? 'Your' : 'Recommended'} position: ${positionLabel(span).toLowerCase().replace('–', ' to ')}`
        return onStage ? (
          <span className="chart-position" aria-label={where}>
            {positionLabel(span)}
          </span>
        ) : (
          <button
            type="button"
            className={moved ? 'chart-position is-moved' : 'chart-position'}
            aria-label={`${where}. Move the chords`}
            onClick={() => setMovingChords(true)}
          >
            {positionLabel(span)}
          </button>
        )
      })()}
      {edited && (
        <button
          type="button"
          className="chart-edited"
          aria-label="This chart has your own edits. Go back to the original chart"
          onClick={() => goBackToOriginal(song)}
        >
          EDITED &middot; back to original
        </button>
      )}
    </div>
  )

  const renderBanners = ({ song, capo, shapesKey, playedKey, lowerKey, sourceKey }: SongChart) => (
    <>
      {song.cue && <div className="chart-cue">{song.cue}</div>}
      {capo > 0 && (
        <div className="chart-capo">
          Capo {capo}: play {shapesKey} shapes, sounds in {playedKey}
        </div>
      )}
      {lowerKey && (
        <div className="chart-warning">
          LOWER KEY — showing original {sourceKey}. Set the transpose with &minus; / + above.
        </div>
      )}
    </>
  )

  const { song: shown, songEdits, band } = chart
  const choice = (name: string) => shapeChoice(name, songEdits, selectedVoicings, band[name])

  return (
    <>
      {editMode ? (
        // The chart itself, editable, with the chord keyboard under it
        <ChartEditor
          // Undo, the cursor and the rest belong to one song: a new song starts a new editor
          key={shown.title}
          title={shown.title}
          heading={renderHeading(chart)}
          banners={renderBanners(chart)}
          sections={chart.sections}
          displaySections={chart.displaySections}
          form={chart.form}
          songKey={chart.shapesKey}
          capo={chart.capo}
          notes={chart.notes}
          onChords={updateChordsAt}
          onSections={next => saveSections(shown.title, next)}
          onNotes={text => saveNotes(shown.title, text)}
          onForm={next => saveForm(shown.title, next)}
          onShape={(chord, pick) => pickSongShape(shown.title, chord, pick)}
        />
      ) : (
        <div ref={scrollRef} className="chart-scroll">
          <div ref={fitRef} className={chart.bands ? 'chart band-chart' : 'chart'}>
            {renderHeading(chart)}
            {renderBanners(chart)}
            {chart.showForm && <FormStrip form={chart.form} letters={chart.letters} />}
            <ChartBody
              chart={chart}
              sectionsRef={sectionsRef}
              // Tappable chords open the voicing picker, except on stage, where a
              // brushed chord must not throw a pop-up over the chart mid-song.
              onChord={onStage ? undefined : setPickerChord}
              focus={
                diagramsVisible
                  ? {
                      index: focusSection?.title === shown.title ? focusSection.index : null,
                      onFocus: index => setFocusSection(index === null ? null : { title: shown.title, index }),
                    }
                  : undefined
              }
            />
            {chart.notes && <div className="chart-notes">{chart.notes}</div>}
          </div>
        </div>
      )}

      {movingChords && !onStage && (
        <MoveChordsSheet song={shown} edits={songEdits} onClose={() => setMovingChords(false)} />
      )}

      {/* Outside the chart, so swipes on the picker cannot change song */}
      {pickerChord && (
        <VoicingPicker
          chord={pickerChord}
          capo={chart.capo}
          selectedIndex={choice(pickerChord).index}
          recommendedIndex={band[pickerChord]}
          onSelect={pick => { pickSongShape(shown.title, pickerChord, pick); setPickerChord(null) }}
          onUseRecommended={!choice(pickerChord).mine ? undefined : () => {
            if (songEdits?.shapes?.[pickerChord] !== undefined) clearSongShape(shown.title, pickerChord)
            else clearVoicing(pickerChord)
            setPickerChord(null)
          }}
          onClose={() => setPickerChord(null)}
        />
      )}
    </>
  )
}
```

The old SongSheet kept the stage rule for chord taps inside `renderTokens` (`if (onStage || keyboard)`); it is now `onChord={onStage ? undefined : ...}` plus ChartBody's own keyboard check. The old `focusable={diagramsVisible && !keyboard}` is now `focus` given only while the shapes are shown, plus ChartBody's keyboard check.

- [ ] **Step 8: Run the new test, the types and every test**

Run: `npx vitest run src/tests/components/song-chart.test.tsx && npx tsc -b --noEmit && npx vitest run`
Expected: `8 passed`, no tsc output, then every test passes with no change to any other test file. If an older test fails, the refactor changed behaviour: compare the failing test with the old SongSheet (`git show HEAD:app/src/components/song/SongSheet.tsx`) and fix SongSheet, not the test.

- [ ] **Step 9: Check the size rule**

Run: `wc -l src/components/song/SongSheet.tsx src/hooks/use-song-chart.ts src/components/song/ChartBody.tsx`
Expected: each under 800 (SongSheet about 250).

- [ ] **Step 10: Commit**

```bash
cd /Users/krys/Documents/coding/cheetsheetForGuitarPlaying && git status --short
git add app/src/hooks/use-song-chart.ts app/src/hooks/use-chart-fit.ts app/src/components/song/ChartBody.tsx app/src/components/song/EmptyList.tsx app/src/components/song/SongSheet.tsx app/src/tests/components/song-chart.test.tsx
git commit -m "refactor: one chart hook and body for both screens; the chart follows an extra song

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The Stage screen

**Files:**
- Create: `app/src/components/stage/StageScreen.tsx`, `app/src/components/stage/StageHeader.tsx`, `app/src/components/stage/NextUp.tsx`, `app/src/styles/stage.css`
- Modify: `app/src/components/song/FormStrip.tsx` (a `short` form: letters and counts only)
- Modify: `app/src/styles/global.css` (one `@import` line)
- Test: `app/src/tests/components/stage-screen.test.tsx` (new)

**Interfaces:**
- Consumes: `useShownSong()` (Task 3); `useSongChart`, `SongChart`, `ChartBody`, `EmptyList`, `useChartFit` (Task 7); `useSwipe`; `FormStrip`.
- Produces:
  - `StageScreen()`: `main[aria-label="Stage"].stage-screen`, holding the header, `div.chart-scroll` (the pedal pages this, as before) and the Next up line.
  - `StageHeader({ chart: SongChart, extraFrom: string | null })`: `header.stage-head`.
  - `NextUp({ next: Song | undefined })`: `div.next-up[role="note"]`, or nothing when the next song has no cue.
  - `FormStrip({ form, letters?, short? })`: with `short`, each chip is the letter and ×N, the full name in its `title`.
  - CSS classes: `.stage-screen`, `.stage-head`, `.stage-row`, `.stage-title`, `.stage-facts`, `.fact`, `.fact.is-warn`, `.fact.is-danger`, `.tag-extra`, `.stage-cue`, `.next-up`, `.next-up-label`, `.next-up-text`, `.form-strip.is-short`. `.fact` and `.tag-extra` are used by Practice too (Task 9).

The screen is not in the app yet; Task 11 puts it there. Until then the old screen stays.

- [ ] **Step 1: Write the failing test** at `app/src/tests/components/stage-screen.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within, act } from '@testing-library/react'
import { StageScreen } from '../../components/stage/StageScreen'
import { DEFAULT_SONGS, GIG_SETLIST_2026 as G } from '../../data/songs'
import { playedKey } from '../../music/setlist-text'
import { useStore } from '../../store/use-store'

const song = (title: string) => DEFAULT_SONGS.find(s => s.title === title)!
const faith = song('Faith')

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
  useStore.setState({ viewMode: 'stage' })
})

const header = () => document.querySelector('.stage-head') as HTMLElement
const goTo = (title: string) => act(() => useStore.getState().goToSong(G.indexOf(title)))

describe('the Stage header', () => {
  it('has the title and the facts: key, BPM as text, time and the GX-10 sound', () => {
    render(<StageScreen />)
    expect(screen.getByRole('main', { name: 'Stage' })).toBeInTheDocument()
    expect(within(header()).getByRole('heading', { name: 'Faith' })).toBeInTheDocument()
    expect(within(header()).getByText(`Key ${playedKey(faith).key}`)).toBeInTheDocument()
    expect(within(header()).getByText(`${faith.bpm} BPM`)).toBeInTheDocument()
    expect(within(header()).getByText(faith.timeSignature)).toBeInTheDocument()
    expect(within(header()).getByLabelText(new RegExp(`^GX-10 sound: ${faith.preset!.name}`))).toHaveTextContent(faith.preset!.slot)
  })

  it('has no tap tempo and no buttons at all', () => {
    render(<StageScreen />)
    expect(within(header()).queryAllByRole('button')).toHaveLength(0)
  })

  it('shows the capo only when the song has one', () => {
    const { unmount } = render(<StageScreen />)
    expect(within(header()).queryByText(/^Capo/)).toBeNull()
    unmount()
    useStore.getState().setCapo('Faith', 2)
    render(<StageScreen />)
    expect(within(header()).getByText('Capo 2')).toBeInTheDocument()
  })

  it('says LOWER KEY when the band plays it lower and no transpose is set', () => {
    goTo("I'm Your Man")
    render(<StageScreen />)
    expect(within(header()).queryByText('LOWER KEY')).toBeNull() // the band key ships with the song
    act(() => useStore.getState().setTranspose("I'm Your Man", 0))
    expect(within(header()).getByText('LOWER KEY')).toBeInTheDocument()
  })

  it('shows the song order as letters with counts, without the names', () => {
    render(<StageScreen />)
    const order = within(header()).getByRole('group', { name: /^Song order: / })
    expect(order.classList.contains('is-short')).toBe(true)
    expect(order.querySelector('.band-letter')).not.toBeNull()
    expect(order.querySelector('.form-name')).toBeNull()
  })

  it('shows the cue in the header, only for songs that have one', () => {
    render(<StageScreen />)
    expect(header().querySelector('.stage-cue')).toBeNull()
    goTo('Papa Was a Rolling Stone')
    expect(header().querySelector('.stage-cue')).toHaveTextContent(song('Papa Was a Rolling Stone').cue!)
  })

  it('tags an extra song with the list it is from', () => {
    useStore.setState({
      setlistData: {
        activeId: 'default',
        lists: {
          default: { id: 'default', name: 'GM Tribute', songTitles: [...G] },
          short: { id: 'short', name: 'Encores', songTitles: [G[20]] },
        },
      },
    })
    useStore.getState().playExtra(G[20], 'short')
    render(<StageScreen />)
    expect(within(header()).getByRole('heading', { name: G[20] })).toBeInTheDocument()
    expect(within(header()).getByText('Extra · from Encores')).toBeInTheDocument()
  })
})

describe('the Stage chart', () => {
  it('has nothing that reacts to a tap', () => {
    const { container } = render(<StageScreen />)
    expect(container.querySelector('.chart-scroll .chart-sections')).not.toBeNull()
    expect(container.querySelector('.chart-chord-tap')).toBeNull()
    expect(container.querySelector('.chart-scroll button')).toBeNull()
  })

  it('has no shapes, no notes, no editing and no neck position', () => {
    const { container } = render(<StageScreen />)
    expect(screen.queryByRole('list', { name: /^Chord shapes/ })).toBeNull()
    expect(container.querySelector('.chart-notes')).toBeNull()
    expect(container.querySelector('.chart-position')).toBeNull()
    expect(screen.queryByRole('button', { name: /^Edit$|Move the chords|capo/i })).toBeNull()
  })

  it('never shows the editor, even when edit mode was left on', () => {
    useStore.setState({ editMode: true })
    render(<StageScreen />)
    expect(screen.queryByRole('group', { name: 'Chord keyboard' })).toBeNull()
    expect(document.querySelector('.chart-scroll .chart-sections')).not.toBeNull()
  })

  it('the keyboard shows no capo and no GX-10 sound', () => {
    useStore.getState().setCapo('Faith', 2)
    useStore.getState().setInstrument('keyboard')
    render(<StageScreen />)
    expect(within(header()).queryByText(/^Capo/)).toBeNull()
    expect(within(header()).queryByLabelText(/^GX-10 sound/)).toBeNull()
  })

  it('says what is wrong when the list is empty', () => {
    useStore.setState({ setlistData: { activeId: 'empty', lists: { empty: { id: 'empty', name: 'Spare', songTitles: [] } } } })
    render(<StageScreen />)
    expect(screen.getByText(/is empty/)).toBeInTheDocument()
  })
})

describe('Next up', () => {
  it('warns one song early when the next song has a cue', () => {
    goTo("Freedom! '90") // the song before Papa Was a Rolling Stone
    render(<StageScreen />)
    const note = screen.getByRole('note')
    expect(note).toHaveTextContent('Next up')
    expect(note).toHaveTextContent(song('Papa Was a Rolling Stone').cue!)
  })

  it('stays out of the way when the next song has no cue', () => {
    render(<StageScreen />)
    expect(screen.queryByRole('note')).toBeNull()
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/tests/components/stage-screen.test.tsx`
Expected: FAIL. `Failed to resolve import "../../components/stage/StageScreen"`.

- [ ] **Step 3: Give FormStrip a short form.** In `app/src/components/song/FormStrip.tsx`:
  - In `interface Props`, under `letters?`, add:

```tsx
  /** Stage: each chip is just its letter and ×N; the full name stays in its tooltip. */
  short?: boolean
```

  - Change the signature to `export function FormStrip({ form, letters, short = false }: Props) {`.
  - Change the group's `className` to:

```tsx
className={letters ? (short ? 'form-strip is-lettered is-short' : 'form-strip is-lettered') : 'form-strip'}
```

  - Change `<span className="form-name">{step.name}</span>` to `{!short && <span className="form-name">{step.name}</span>}`.

- [ ] **Step 4: Write `app/src/components/stage/NextUp.tsx`**

```tsx
import type { Song } from '../../types'

/**
 * A heads-up one song early: time to grab the acoustic, or put the guitar
 * down. One line above the bar, only when the next song has a cue.
 */
export function NextUp({ next }: { next: Song | undefined }) {
  if (!next?.cue) return null
  return (
    <div className="next-up" role="note">
      <span className="next-up-label">Next up</span>
      <span className="next-up-text">{next.cue}</span>
    </div>
  )
}
```

- [ ] **Step 5: Write `app/src/components/stage/StageHeader.tsx`**

```tsx
import type { SongChart } from '../../hooks/use-song-chart'
import { FormStrip } from '../song/FormStrip'

interface Props {
  chart: SongChart
  /** The list an extra song comes from, or null. */
  extraFrom: string | null
}

/**
 * Only what is needed while playing. Upright: the title and the facts, then
 * the song order in letters, then the cue. On its side the same on one row
 * (stage.css). Nothing here is a button.
 */
export function StageHeader({ chart, extraFrom }: Props) {
  const { song, keyboard } = chart
  return (
    <header className="stage-head">
      <div className="stage-row">
        <h1 className="stage-title">{song.title}</h1>
        {extraFrom && <span className="tag-extra">Extra &middot; from {extraFrom}</span>}
        <span className="stage-facts">
          <span className="fact">Key {chart.playedKey}</span>
          <span className="fact">{chart.bpm} BPM</span>
          <span className="fact">{song.timeSignature}</span>
          {/* The GX-10 sound and the capo are the guitarist's: the keyboard has neither */}
          {song.preset && !keyboard && (
            <span
              className="fact"
              aria-label={`GX-10 sound: ${song.preset.name}${song.preset.solo ? `, ${song.preset.solo} for the solo` : ''}`}
            >
              {song.preset.slot} {song.preset.name}
              {song.preset.solo && ` → ${song.preset.solo} solo`}
            </span>
          )}
          {chart.capo > 0 && !keyboard && <span className="fact is-warn">Capo {chart.capo}</span>}
          {chart.lowerKey && <span className="fact is-danger">LOWER KEY</span>}
        </span>
      </div>
      {chart.showForm && (
        <div className="stage-row">
          <FormStrip form={chart.form} letters={chart.letters} short />
        </div>
      )}
      {song.cue && <div className="stage-cue">{song.cue}</div>}
    </header>
  )
}
```

- [ ] **Step 6: Write `app/src/components/stage/StageScreen.tsx`**

```tsx
import { useLayoutEffect, useRef } from 'react'
import { useStore } from '../../store/use-store'
import { useShownSong } from '../../hooks/use-shown-song'
import { useSongChart } from '../../hooks/use-song-chart'
import { useChartFit } from '../../hooks/use-chart-fit'
import { useSwipe } from '../../hooks/use-swipe'
import { ChartBody } from '../song/ChartBody'
import { EmptyList } from '../song/EmptyList'
import { StageHeader } from './StageHeader'
import { NextUp } from './NextUp'

/**
 * The screen played from: the header, the whole chart fitted between it and
 * the bar, and the Next up line. Nothing on it can be edited, and nothing on
 * the chart reacts to a tap; a swipe still changes song.
 */
export function StageScreen() {
  const { song, extraFrom, next } = useShownSong()
  const chart = useSongChart(song)
  const nextSong = useStore(s => s.nextSong)
  const prevSong = useStore(s => s.prevSong)

  const scrollRef = useRef<HTMLDivElement>(null)
  const fitRef = useRef<HTMLDivElement>(null)
  const sectionsRef = useRef<HTMLDivElement>(null)

  // The Next up line takes room from the chart, so it is part of what is fitted
  const fitKey = chart ? JSON.stringify([chart.fitKey, 'stage', next?.cue ?? '']) : ''
  useChartFit(scrollRef, fitRef, sectionsRef, fitKey, { bands: chart?.bands ?? false, enabled: !!chart })

  // Every song opens at its top
  const songTitle = song?.title
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [songTitle])

  useSwipe(scrollRef, { onSwipeLeft: nextSong, onSwipeRight: prevSong }, true)

  return (
    <main className="stage-screen" aria-label="Stage">
      {chart && <StageHeader chart={chart} extraFrom={extraFrom} />}
      <div ref={scrollRef} className="chart-scroll">
        {chart ? (
          <div ref={fitRef} className={chart.bands ? 'chart band-chart' : 'chart'}>
            <ChartBody chart={chart} sectionsRef={sectionsRef} />
          </div>
        ) : (
          <EmptyList />
        )}
      </div>
      <NextUp next={next} />
    </main>
  )
}
```

- [ ] **Step 7: Write `app/src/styles/stage.css`**

```css
/* ---------- The two screens fill the space above the bar ---------- */
.stage-screen,
.practice-screen { flex: 1; min-height: 0; display: flex; flex-direction: column; }

/* ---------- Facts and tags, shared by both headers ---------- */
.fact {
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--badge-bg);
  color: var(--text);
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
}
.fact.is-warn { background: #f59e0b; color: #111; }
.fact.is-danger { background: #ea580c; color: #fff; }
.tag-extra { padding: 3px 10px; border-radius: 6px; background: #facc15; color: #111; font-size: 14px; font-weight: 800; white-space: nowrap; }

/* ---------- Stage: only what is needed while playing ---------- */
/* The top bar is gone, so the header takes the safe area at the top */
.stage-head {
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: calc(8px + var(--safe-top)) 16px 8px;
  border-bottom: 1px solid var(--border);
}
.stage-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
.stage-title { margin: 0; font-size: 28px; font-weight: 800; line-height: 1.1; }
.stage-facts { display: flex; flex-wrap: wrap; gap: 6px; }
.stage-cue { color: #facc15; font-size: 17px; font-weight: 700; }
.form-strip.is-short .form-chip { padding: 2px 6px 2px 3px; }

/* One line above the bar; a long cue is cut with … */
.next-up {
  flex: none;
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 6px 16px;
  border-top: 1px solid var(--border);
  background: var(--picker-bg);
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
}
.next-up-label { flex: none; color: #facc15; font-size: 13px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
.next-up-text { overflow: hidden; text-overflow: ellipsis; }

/* ---------- On its side: the header on one row ---------- */
@media (orientation: landscape) and (min-width: 900px) {
  .stage-head { flex-direction: row; flex-wrap: wrap; align-items: center; column-gap: 12px; padding-top: calc(6px + var(--safe-top)); padding-bottom: 6px; }
  .stage-row { display: contents; }
  .stage-title { font-size: 24px; }
  .stage-cue { flex-basis: 100%; }
}
```

- [ ] **Step 8: Import it.** In `app/src/styles/global.css`, under `@import './sheets.css';`, add:

```css
@import './stage.css';
```

- [ ] **Step 9: Run the new test, the types and every test**

Run: `npx vitest run src/tests/components/stage-screen.test.tsx && npx tsc -b --noEmit && npx vitest run`
Expected: `14 passed`, no tsc output, then every test passes (band-chart's lettered chips still read their names: `short` is off by default).

- [ ] **Step 10: Commit**

```bash
cd /Users/krys/Documents/coding/cheetsheetForGuitarPlaying && git status --short
git add app/src/components/stage/StageScreen.tsx app/src/components/stage/StageHeader.tsx app/src/components/stage/NextUp.tsx app/src/components/song/FormStrip.tsx app/src/styles/stage.css app/src/styles/global.css app/src/tests/components/stage-screen.test.tsx
git commit -m "feat: the Stage screen, with its header, the chart and Next up

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: The Practice header and its setup row

**Files:**
- Create: `app/src/components/practice/PracticeHeader.tsx`, `app/src/components/practice/PracticeSetup.tsx`, `app/src/styles/practice.css`
- Modify: `app/src/styles/global.css` (one `@import` line)
- Test: `app/src/tests/components/practice-header.test.tsx` (new)

**Interfaces:**
- Consumes: `SongChart` (Task 7); `useShownSong()` (Task 3); `songbookOf(song)` (Task 1); `FormStrip`; `CapoPicker({ song, edits, capo, onPick, onClose })`; `MoveChordsSheet({ song, edits, onClose })`; `SaveStatus()`; `positionLabel(span)`; `guitarFor(song, edits, view)`; store actions `toggleEditMode`, `resetEdits(title)`, `setTranspose(title, n)`, `clearTranspose(title)`, `setCapo(title, fret)`, `setSongGuitar(title, guitar)`, `useBuiltInChart(title)`, `showToast(text)`.
- Produces:
  - `PracticeHeader({ chart: SongChart, extraFrom: string | null })`: `header.practice-head` with two `.ph-line`s: (title row, setup row) and (facts row, named chips).
  - `PracticeSetup({ chart: SongChart })`: `div.ph-setup[role="group"][aria-label="Song setup"]`.
  - Accessible names kept from the old top bar and title line, so later tasks can port old tests by name: `Transpose down`, `Transpose up`, `Add a capo` / `Capo on fret N. Change capo`, `Played on electric guitar. Switch to acoustic for this song`, `Recommended position: frets 2 to 9. Move the chords`, `This chart has your own edits. Go back to the original chart`, `GX-10 sound: …`, `Edit` / `Done`, `Reset`.
  - The key button's name is `Key <key>. <what a tap does>`, where what a tap does is `Show original key`, `Back to band key`, `Clear transpose` or `Transpose`.
  - CSS classes: `.practice-head`, `.ph-line`, `.ph-row`, `.ph-title`, `.ph-artist`, `.ph-badge`, `.ph-setup`, `.setup-key`, `.setup-btn`, `.setup-btn.is-moved`, `.setup-btn.is-active`, `.setup-btn.is-danger`, `.setup-sub`.

- [ ] **Step 1: Write the failing test** at `app/src/tests/components/practice-header.test.tsx`

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { PracticeHeader } from '../../components/practice/PracticeHeader'
import { useShownSong } from '../../hooks/use-shown-song'
import { useSongChart } from '../../hooks/use-song-chart'
import { DEFAULT_SONGS, GIG_SETLIST_2026 as G } from '../../data/songs'
import { useStore } from '../../store/use-store'
import { moveChords } from '../../store/song-shapes'

const faith = DEFAULT_SONGS.find(s => s.title === 'Faith')!
const mine = faith.sections.map((s, i) => (i === 1 ? { ...s, chords: 'B  A' } : s))

/** The header as the Practice screen draws it, for the song on screen. */
function Header() {
  const { song, extraFrom } = useShownSong()
  const chart = useSongChart(song)
  return chart ? <PracticeHeader chart={chart} extraFrom={extraFrom} /> : null
}

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})
afterEach(() => {
  vi.restoreAllMocks()
})

const button = (name: string | RegExp) => screen.getByRole('button', { name })
const keyButton = () => button(/^Key /)
const goTo = (title: string) => act(() => useStore.getState().goToSong(G.indexOf(title)))

describe('the title row', () => {
  it('has the title, the artist and the songbook number', () => {
    render(<Header />)
    expect(screen.getByRole('heading', { name: 'Faith' })).toBeInTheDocument()
    expect(screen.getByText(faith.artist)).toBeInTheDocument()
    expect(screen.getByText('Songbook no. 12')).toBeInTheDocument()
  })

  it('has no songbook badge for a song not in the book', () => {
    goTo('Amazing')
    render(<Header />)
    expect(screen.queryByText(/^Songbook no\./)).toBeNull()
  })

  it('tags an extra song', () => {
    useStore.getState().playExtra(G[20], 'default')
    render(<Header />)
    expect(screen.getByRole('heading', { name: G[20] })).toBeInTheDocument()
    expect(screen.getByText(/^Extra · from /)).toBeInTheDocument()
  })

  it('says EDITED for your own chords, and one tap goes back to the original', () => {
    const ask = vi.spyOn(window, 'confirm').mockReturnValue(true)
    useStore.setState({ edits: { Faith: { sections: mine } } })
    render(<Header />)
    const tag = button('This chart has your own edits. Go back to the original chart')
    expect(tag).toHaveTextContent('EDITED')
    fireEvent.click(tag)
    expect(ask).toHaveBeenCalledWith(expect.stringContaining('Earlier versions'))
    expect(useStore.getState().edits['Faith']).toBeUndefined()
    expect(useStore.getState().toast).toBe('Faith shows the original chart')
  })

  it('has no EDITED tag and no song order while editing', () => {
    useStore.setState({ edits: { Faith: { sections: mine } }, editMode: true })
    render(<Header />)
    expect(screen.queryByRole('button', { name: /Go back to the original chart/ })).toBeNull()
    expect(button('Reset')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /^Song order:/ })).toBeNull() // the editor has its own
  })
})

describe('the setup row', () => {
  it('moves the key down and up, and shows a moved key in orange', () => {
    render(<Header />)
    expect(keyButton().classList.contains('is-moved')).toBe(false)
    fireEvent.click(button('Transpose up'))
    expect(useStore.getState().edits['Faith'].transpose).toBe(1)
    expect(keyButton().classList.contains('is-moved')).toBe(true)
    fireEvent.click(button('Transpose down'))
    fireEvent.click(button('Transpose down'))
    expect(useStore.getState().edits['Faith'].transpose).toBe(-1)
  })

  it("toggles a song with a band key between the band key and the original recording's", () => {
    goTo("I'm Your Man")
    render(<Header />)
    expect(keyButton()).toHaveAccessibleName(/Show original key$/)
    expect(keyButton().classList.contains('is-moved')).toBe(true) // the band plays it 2 lower
    fireEvent.click(keyButton())
    expect(useStore.getState().edits["I'm Your Man"].transpose).toBe(0)
    expect(keyButton()).toHaveAccessibleName(/Back to band key$/)
    fireEvent.click(keyButton())
    expect(useStore.getState().edits["I'm Your Man"]?.transpose).toBeUndefined()
  })

  it('picks a capo, marking the easiest one', () => {
    render(<Header />)
    fireEvent.click(button('Add a capo'))
    const picker = screen.getByRole('dialog', { name: 'Capo' })
    expect(within(picker).getByText('Easiest')).toBeInTheDocument()
    fireEvent.click(within(picker).getByRole('button', { name: /Fret 4/ }))
    expect(useStore.getState().edits['Faith'].capo).toBe(4)
    expect(button('Capo on fret 4. Change capo')).toHaveTextContent('Capo 4')
  })

  it("follows the song's sound, and switches the guitar for this song only", () => {
    render(<Header />) // Faith's sound is FUNK on the GX-10: electric
    fireEvent.click(button(/^Played on electric guitar/))
    expect(useStore.getState().edits['Faith'].guitar).toBe('acoustic')
    expect(button(/^Played on acoustic guitar/)).toHaveTextContent('Acoustic')
  })

  it('opens Move chords, showing where the shapes sit', () => {
    render(<Header />)
    const move = button('Recommended position: frets 2 to 9. Move the chords')
    expect(move).toHaveTextContent('Frets 2–9')
    fireEvent.click(move)
    const sheet = screen.getByRole('dialog', { name: 'Move chords' })
    expect(within(sheet).getByText('Songbook')).toBeInTheDocument()
  })

  it('shows a moved song as yours', () => {
    moveChords('Faith', 7)
    render(<Header />)
    expect(button(/^Your position: frets \d+ to \d+\. Move the chords$/)).toBeInTheDocument()
  })

  it('turns Edit into Done, with Reset and the save status beside it', () => {
    render(<Header />)
    expect(screen.queryByRole('status')).toBeNull()
    fireEvent.click(button('Edit'))
    expect(useStore.getState().editMode).toBe(true)
    expect(button('Done')).toBeInTheDocument()
    expect(button('Reset')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Saved')
  })

  it('asks before Reset', () => {
    const reset = vi.fn()
    useStore.setState({ editMode: true, resetEdits: reset })
    const ask = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<Header />)
    fireEvent.click(button('Reset'))
    expect(ask).toHaveBeenCalledWith(expect.stringContaining('Earlier versions'))
    expect(reset).not.toHaveBeenCalled()
    ask.mockReturnValue(true)
    fireEvent.click(button('Reset'))
    expect(reset).toHaveBeenCalledWith('Faith')
  })
})

describe('the facts and the song order', () => {
  it('has BPM, time and the GX-10 sound as text', () => {
    render(<Header />)
    expect(screen.getByText(`${faith.bpm} BPM`)).toBeInTheDocument()
    expect(screen.getByText(faith.timeSignature)).toBeInTheDocument()
    expect(screen.getByLabelText(new RegExp(`^GX-10 sound: ${faith.preset!.name}`))).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /BPM|tempo/i })).toBeNull()
  })

  it('says LOWER KEY when the band plays it lower and no transpose is set', () => {
    goTo("I'm Your Man")
    useStore.getState().setTranspose("I'm Your Man", 0)
    render(<Header />)
    expect(screen.getByText('LOWER KEY')).toBeInTheDocument()
  })

  it('shows the song order as named chips', () => {
    render(<Header />)
    const order = screen.getByRole('group', { name: /^Song order: / })
    expect(order.classList.contains('is-short')).toBe(false)
    expect(order.querySelector('.form-name')).toHaveTextContent('Intro')
  })
})

describe('the keyboard', () => {
  it('the keyboard has no capo, guitar or Move chords', () => {
    useStore.getState().setInstrument('keyboard')
    render(<Header />)
    expect(screen.getByText('Keyboard')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /capo/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /guitar\. Switch to/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Move the chords/ })).toBeNull()
    expect(screen.queryByLabelText(/^GX-10 sound/)).toBeNull()
    expect(keyButton()).toBeInTheDocument() // the key still moves
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/tests/components/practice-header.test.tsx`
Expected: FAIL. `Failed to resolve import "../../components/practice/PracticeHeader"`.

- [ ] **Step 3: Write `app/src/components/practice/PracticeSetup.tsx`**

```tsx
import { useState } from 'react'
import { useChartView, useStore } from '../../store/use-store'
import { guitarFor } from '../../music/chart-view'
import { positionLabel } from '../../hooks/use-band-positions'
import type { SongChart } from '../../hooks/use-song-chart'
import { CapoPicker } from '../song/CapoPicker'
import { MoveChordsSheet } from '../song/MoveChordsSheet'
import { SaveStatus } from '../edit/SaveStatus'

/**
 * The song's own settings, next to the song: key, capo, guitar, Move chords
 * and Edit. While editing, Edit is Done, with Reset and the save status beside it.
 */
export function PracticeSetup({ chart }: { chart: SongChart }) {
  const { song, songEdits, keyboard, semitones, capo, span } = chart
  const view = useChartView()
  const editMode = useStore(s => s.editMode)
  const toggleEditMode = useStore(s => s.toggleEditMode)
  const resetEdits = useStore(s => s.resetEdits)
  const setTranspose = useStore(s => s.setTranspose)
  const clearTranspose = useStore(s => s.clearTranspose)
  const setCapo = useStore(s => s.setCapo)
  const setSongGuitar = useStore(s => s.setSongGuitar)
  const [showCapo, setShowCapo] = useState(false)
  const [moving, setMoving] = useState(false)

  // Transposing only changes an offset. The stored chart stays at source
  // pitch, so any amount of transposing is reversible and nothing is lost.
  // The key itself: from your own transpose back to the band key; from the
  // band key to the original recording key and back again (for playing along).
  const bandKey = song.transpose ?? 0
  const ownTranspose = songEdits?.transpose
  const keyAction = ownTranspose !== undefined
    ? (bandKey !== 0 ? 'Back to band key' : 'Clear transpose')
    : (bandKey !== 0 ? 'Show original key' : 'Transpose')
  const onKey = () => {
    if (ownTranspose !== undefined && !(ownTranspose === 0 && bandKey === 0)) clearTranspose(song.title)
    else if (bandKey !== 0) setTranspose(song.title, 0)
  }

  const played = guitarFor(song, songEdits, view)
  const other = played === 'electric' ? 'acoustic' : 'electric'
  const moved = songEdits?.neck !== undefined
  const where = span ? `${moved ? 'Your' : 'Recommended'} position: ${positionLabel(span).toLowerCase().replace('–', ' to ')}` : ''

  return (
    <div className="ph-setup" role="group" aria-label="Song setup">
      <span className="setup-key">
        <button className="setup-btn" aria-label="Transpose down" onClick={() => setTranspose(song.title, semitones - 1)}>&minus;</button>
        <button
          className={semitones !== 0 ? 'setup-btn is-moved' : 'setup-btn'}
          aria-label={`Key ${chart.playedKey}. ${keyAction}`}
          onClick={onKey}
        >
          Key {chart.playedKey}
        </button>
        <button className="setup-btn" aria-label="Transpose up" onClick={() => setTranspose(song.title, semitones + 1)}>+</button>
      </span>

      {keyboard ? (
        // The keyboard has no capo, no guitar and no shapes to move
        <span className="ph-badge">Keyboard</span>
      ) : (
        <>
          <button
            className={capo > 0 ? 'setup-btn is-moved' : 'setup-btn'}
            aria-label={capo > 0 ? `Capo on fret ${capo}. Change capo` : 'Add a capo'}
            onClick={() => setShowCapo(true)}
          >
            {capo > 0 ? `Capo ${capo}` : 'No capo'} &#9662;
          </button>
          <button
            className="setup-btn"
            aria-label={`Played on ${played} guitar. Switch to ${other} for this song`}
            onClick={() => setSongGuitar(song.title, other)}
          >
            {played === 'electric' ? 'Electric' : 'Acoustic'} &#9662;
          </button>
          {span && (
            <button
              className={moved ? 'setup-btn is-moved' : 'setup-btn'}
              aria-label={`${where}. Move the chords`}
              onClick={() => setMoving(true)}
            >
              Move chords <span className="setup-sub">{positionLabel(span)}</span> &#9662;
            </button>
          )}
        </>
      )}

      <button className={editMode ? 'setup-btn is-active' : 'setup-btn'} onClick={toggleEditMode}>
        {editMode ? 'Done' : 'Edit'}
      </button>
      {editMode && (
        <button
          className="setup-btn is-danger"
          onClick={() => {
            if (confirm(`Reset "${song.title}" to the original chart?\n\nYour version is kept under Earlier versions, at the bottom of the chart.`)) {
              resetEdits(song.title)
            }
          }}
        >
          Reset
        </button>
      )}
      {editMode && <SaveStatus />}

      {showCapo && (
        <CapoPicker
          song={song}
          edits={songEdits}
          capo={capo}
          onPick={fret => { setCapo(song.title, fret); setShowCapo(false) }}
          onClose={() => setShowCapo(false)}
        />
      )}
      {moving && <MoveChordsSheet song={song} edits={songEdits} onClose={() => setMoving(false)} />}
    </div>
  )
}
```

- [ ] **Step 4: Write `app/src/components/practice/PracticeHeader.tsx`**

```tsx
import { useStore } from '../../store/use-store'
import { songbookOf } from '../../music/songbook'
import type { SongChart } from '../../hooks/use-song-chart'
import { FormStrip } from '../song/FormStrip'
import { PracticeSetup } from './PracticeSetup'

interface Props {
  chart: SongChart
  /** The list an extra song comes from, or null. */
  extraFrom: string | null
}

/**
 * Practice's header. Upright, four rows: the title, the setup, the facts, the
 * song order. On its side two (practice.css): title and setup, then facts and order.
 */
export function PracticeHeader({ chart, extraFrom }: Props) {
  const { song, keyboard } = chart
  const editMode = useStore(s => s.editMode)
  const useBuiltInChart = useStore(s => s.useBuiltInChart)
  const showToast = useStore(s => s.showToast)
  const book = songbookOf(song)

  const goBackToOriginal = () => {
    if (!confirm(`Go back to the original chart for "${song.title}"?\n\nYour chords are kept under Earlier versions (Edit, at the bottom of the chart).`)) return
    useBuiltInChart(song.title)
    showToast(`${song.title} shows the original chart`)
  }

  return (
    <header className="practice-head">
      <div className="ph-line">
        <div className="ph-row">
          <h1 className="ph-title">{song.title}</h1>
          <span className="ph-artist">{song.artist}</span>
          {extraFrom && <span className="tag-extra">Extra &middot; from {extraFrom}</span>}
          {book !== undefined && <span className="ph-badge">Songbook no. {book}</span>}
          {/* While editing, Reset and the earlier versions are where to go back from */}
          {chart.edited && !editMode && (
            <button
              type="button"
              className="chart-edited"
              aria-label="This chart has your own edits. Go back to the original chart"
              onClick={goBackToOriginal}
            >
              EDITED &middot; back to original
            </button>
          )}
        </div>
        <PracticeSetup chart={chart} />
      </div>
      <div className="ph-line">
        <div className="ph-row">
          <span className="fact">{chart.bpm} BPM</span>
          <span className="fact">{song.timeSignature}</span>
          {song.preset && !keyboard && (
            <span
              className="fact"
              aria-label={`GX-10 sound: ${song.preset.name}${song.preset.solo ? `, ${song.preset.solo} for the solo` : ''}`}
            >
              {song.preset.slot} {song.preset.name}
              {song.preset.solo && ` → ${song.preset.solo} solo`}
            </span>
          )}
          {chart.lowerKey && <span className="fact is-danger">LOWER KEY</span>}
        </div>
        {/* While editing, the editor has the song order: two would read as a mistake */}
        {chart.showForm && !editMode && <FormStrip form={chart.form} letters={chart.letters} />}
      </div>
    </header>
  )
}
```

- [ ] **Step 5: Write `app/src/styles/practice.css`**

```css
/* ---------- Practice: the song's setup and facts on top ---------- */
/* The top bar is gone, so the header takes the safe area at the top */
.practice-head {
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: calc(8px + var(--safe-top)) 16px 8px;
  border-bottom: 1px solid var(--border);
}
.ph-line { display: flex; flex-direction: column; gap: 8px; }
.ph-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
.ph-title { margin: 0; font-size: 26px; font-weight: 800; line-height: 1.1; }
.ph-artist { color: var(--text-muted); font-size: 15px; }
.ph-badge { padding: 3px 10px; border: 1px solid var(--border); border-radius: 6px; color: var(--text-muted); font-size: 14px; font-weight: 700; white-space: nowrap; }
.ph-setup { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.setup-key { display: inline-flex; }
.setup-btn {
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
}
.setup-key .setup-btn { border-radius: 0; }
.setup-key .setup-btn:first-child { border-radius: 8px 0 0 8px; }
.setup-key .setup-btn:last-child { border-radius: 0 8px 8px 0; }
.setup-btn.is-moved { border-color: #f59e0b; color: #f59e0b; }
.setup-btn.is-active { border-color: var(--accent); background: var(--accent); color: var(--bg); }
.setup-btn.is-danger { border-color: var(--danger); color: var(--danger); }
.setup-sub { margin-left: 4px; color: var(--text-muted); font-size: 13px; font-weight: 500; }

/* ---------- On its side: two rows ---------- */
@media (orientation: landscape) and (min-width: 900px) {
  .ph-line { flex-direction: row; flex-wrap: wrap; align-items: center; column-gap: 16px; }
}
```

- [ ] **Step 6: Import it.** In `app/src/styles/global.css`, under `@import './stage.css';`, add:

```css
@import './practice.css';
```

- [ ] **Step 7: Run the new test, the types and every test**

Run: `npx vitest run src/tests/components/practice-header.test.tsx && npx tsc -b --noEmit && npx vitest run`
Expected: `17 passed`, no tsc output, then every test passes.

- [ ] **Step 8: Commit**

```bash
cd /Users/krys/Documents/coding/cheetsheetForGuitarPlaying && git status --short
git add app/src/components/practice/PracticeHeader.tsx app/src/components/practice/PracticeSetup.tsx app/src/styles/practice.css app/src/styles/global.css app/src/tests/components/practice-header.test.tsx
git commit -m "feat: the Practice header, with the song's setup beside it

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: The Practice panel: shapes and the book

**Files:**
- Create: `app/src/components/practice/PracticePanel.tsx`, `app/src/components/practice/ShapeTiles.tsx`, `app/src/components/practice/BookFacts.tsx`
- Modify: `app/src/styles/practice.css` (append the panel rules)
- Test: `app/src/tests/components/practice-panel.test.tsx` (new)

**Interfaces:**
- Consumes: `SongChart` (Task 7); `useShownSong()` (Task 3); `songbookOf` (Task 1); `useBandPositions`, `shapeChoice`; `pickSongShape`, `clearSongShape`; `shownSections`, `guitarFor`; `voicingsFor`, `ownShapesFor`, `isPlayersShape`, `shapeText`, `hasShapes`; `strum`; `ChordDiagram`; store `focusSection`, `setFocusSection`, `selectedVoicings`, `clearVoicing`, `ownShapes`.
- Produces:
  - `PracticePanel({ chart: SongChart, picked: string | null, onPick: (chord: string | null) => void })`: `aside.practice-panel[aria-label="Shapes and the book"]`. For the keyboard it holds only the book facts.
  - `ShapeTiles({ chart, picked, onPick })`:
    - With nothing picked: heading "Shapes in this song" (or "Shapes in <part>" while a part is focused, with a `Showing <part> only. Show the whole song` button), and `role="list"` named `Chord shapes` (or `Chord shapes for <part>`) of `role="listitem"` tiles named by chord. A tile tap calls `onPick(chord)`.
    - With a chord picked: heading "Shapes for X · N of them", an `All shapes` button (`onPick(null)`), `Use the recommended shape` when the pick is the player's, and `role="group"` named `Shapes for X` of `role="button"` tiles named as the old picker named them (`E at 7th fret, recommended, selected`). A tile tap makes it this song's shape.
  - `BookFacts({ chart })`: `section[aria-label="From the book and the notes"]`.
  - CSS classes: `.practice-body`, `.practice-panel`, `.tiles-head`, `.tiles-title`, `.tiles-hint`, `.tiles`, `.tile`, `.tile.is-chosen`, `.tile-name`, `.tile-where`, `.tile-frets`, `.book-facts`, `.facts-capo`, `button.chart-chord-tap`, `.is-picked`.

The panel is not in the app yet; Task 11 puts it there.

- [ ] **Step 1: Write the failing test** at `app/src/tests/components/practice-panel.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { PracticePanel } from '../../components/practice/PracticePanel'
import { useShownSong } from '../../hooks/use-shown-song'
import { useSongChart } from '../../hooks/use-song-chart'
import { DEFAULT_SONGS, GIG_SETLIST_2026 as G } from '../../data/songs'
import { useStore } from '../../store/use-store'
import { pickSongShape } from '../../store/song-shapes'
import { setOwnShapes } from '../../music/voicings'

const song = (title: string) => DEFAULT_SONGS.find(s => s.title === title)!

/** The panel as the Practice screen holds it: a chord picked on the chart, or none. */
function Panel() {
  const { song: shown } = useShownSong()
  const chart = useSongChart(shown)
  const [picked, setPicked] = useState<string | null>(null)
  return chart ? <PracticePanel chart={chart} picked={picked} onPick={setPicked} /> : null
}

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
  setOwnShapes({})
})

const tile = (name: string) =>
  within(screen.getByRole('list', { name: /^Chord shapes/ })).getByRole('listitem', { name })
/** The chord shapes listed, in order. */
const shapes = () =>
  within(screen.getByRole('list', { name: /^Chord shapes/ })).getAllByRole('listitem').map(el => el.getAttribute('aria-label'))
const goTo = (title: string) => act(() => useStore.getState().goToSong(G.indexOf(title)))
const FAITH_ALL = ['B', 'E', 'G#m', 'C#m', 'F#']

describe('shapes in this song', () => {
  it("show Faith's shapes from the songbook, marked with where they come from", () => {
    render(<Panel />)
    expect(screen.getByRole('heading', { name: 'Shapes in this song' })).toBeInTheDocument()
    expect(shapes()).toEqual(FAITH_ALL)
    expect(within(tile('B')).getByText('7th fret')).toBeInTheDocument()
    expect(within(tile('B')).getByText('7-9-9-8-7-7')).toBeInTheDocument()
    for (const name of FAITH_ALL) expect(within(tile(name)).getByText('Songbook')).toBeInTheDocument()
    expect(within(tile('B')).getByRole('button', { name: 'Play B' })).toBeInTheDocument()
  })

  it('drop the songbook marks when the song is moved to another key', () => {
    useStore.getState().setTranspose('Faith', -2)
    render(<Panel />)
    // The book facts still say where the book's shapes come from; the tiles no longer use them
    expect(within(screen.getByRole('list', { name: /^Chord shapes/ })).queryByText('Songbook')).toBeNull()
    expect(within(tile('A')).getByText('Electric')).toBeInTheDocument()
  })

  it('keep a pick saved before recommendations existed on the shape it meant', () => {
    useStore.setState({ selectedVoicings: { B: 0 } }) // the library's first B: x-2-4-4-4-2
    render(<Panel />)
    expect(within(tile('B')).getByText('2nd fret')).toBeInTheDocument()
    expect(within(tile('B')).getByText('Your pick')).toBeInTheDocument()
  })

  it('keep open chords for the acoustic song', () => {
    goTo('Waiting (Reprise)')
    render(<Panel />)
    expect(within(tile('G')).getByText('Open')).toBeInTheDocument()
  })

  it("show just one part's shapes while a part is picked on the chart, and let go of it", () => {
    useStore.getState().setFocusSection({ title: 'Faith', index: 0 }) // Intro
    render(<Panel />)
    expect(screen.getByRole('heading', { name: 'Shapes in Intro' })).toBeInTheDocument()
    expect(shapes()).toEqual(['B'])
    fireEvent.click(screen.getByRole('button', { name: /Show the whole song/ }))
    expect(shapes()).toEqual(FAITH_ALL)
  })

  it('show a part in the key the band plays', () => {
    goTo('Kissing a Fool') // the book's Eb, played in D
    const index = song('Kissing a Fool').sections.findIndex(s => s.name === 'Last verse')
    useStore.getState().setFocusSection({ title: 'Kissing a Fool', index })
    render(<Panel />)
    expect(shapes()).toEqual(['D6', 'D#dim7', 'Em7', 'Bb(b5)', 'A7'])
  })
})

describe('shapes for one chord', () => {
  it('open from a tile, mark the one in this song, and go back with All shapes', () => {
    render(<Panel />)
    fireEvent.click(tile('E'))
    expect(screen.getByRole('heading', { name: /^Shapes for E · \d+ of them$/ })).toBeInTheDocument()
    const chosen = screen.getByRole('button', { name: /^E at 7th fret, recommended, selected$/ })
    expect(within(chosen).getByText('In this song')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'All shapes' }))
    expect(shapes()).toEqual(FAITH_ALL)
  })

  it('keep a shape you pick by hand, and can go back to the recommended one', () => {
    render(<Panel />)
    fireEvent.click(tile('E'))
    fireEvent.click(screen.getByRole('button', { name: 'E at Open' }))
    expect(screen.getByRole('button', { name: /^E at Open, selected$/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'All shapes' }))
    expect(within(tile('E')).getByText('Open')).toBeInTheDocument()
    expect(within(tile('E')).getByText('Your pick')).toBeInTheDocument()

    fireEvent.click(tile('E'))
    fireEvent.click(screen.getByRole('button', { name: 'Use the recommended shape' }))
    fireEvent.click(screen.getByRole('button', { name: 'All shapes' }))
    expect(within(tile('E')).getByText('7th fret')).toBeInTheDocument()
    expect(within(tile('E')).getByText('Songbook')).toBeInTheDocument()
    expect(useStore.getState().selectedVoicings.E).toBeUndefined()
  })
})

describe('your own shapes', () => {
  // An E with its third and fifth up the neck. A muted string in the middle:
  // no generator makes it, and the library does not have it.
  const OWN = '0-x-6-4-0-0'

  it('are offered marked Yours, and a tap keeps one for this song only', () => {
    useStore.getState().addOwnShape('E', OWN)
    render(<Panel />)
    fireEvent.click(tile('E'))
    expect(screen.getByText(/A shape you tap is used for E in this song only/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'E at 4th fret, yours' }))
    expect(useStore.getState().edits.Faith?.shapes?.E).toBe(OWN)
    expect(useStore.getState().selectedVoicings.E).toBeUndefined()
    fireEvent.click(screen.getByRole('button', { name: 'All shapes' }))
    expect(within(tile('E')).getByText('4th fret')).toBeInTheDocument()
    expect(within(tile('E')).getByText('Yours')).toBeInTheDocument()
  })

  it('go back to the songbook shape when the own shape is removed', () => {
    useStore.getState().addOwnShape('E', OWN)
    pickSongShape('Faith', 'E', OWN)
    render(<Panel />)
    expect(within(tile('E')).getByText('Yours')).toBeInTheDocument()
    act(() => useStore.getState().removeOwnShape('E', OWN))
    expect(within(tile('E')).getByText('7th fret')).toBeInTheDocument()
    expect(within(tile('E')).getByText('Songbook')).toBeInTheDocument()
  })
})

describe('from the book and the notes', () => {
  const facts = () => screen.getByRole('region', { name: 'From the book and the notes' })

  it('gives the songbook number, where the shapes come from, the key and the notes', () => {
    render(<Panel />)
    expect(within(facts()).getByText('George Michael Complete, no. 12')).toBeInTheDocument()
    expect(within(facts()).getByText('Shapes').nextElementSibling).toHaveTextContent(song('Faith').shapesFrom!)
    expect(within(facts()).getByText(song('Faith').notes)).toBeInTheDocument()
  })

  it('says when a song is not in the songbook', () => {
    goTo('Amazing')
    render(<Panel />)
    expect(within(facts()).getByText('Not in the songbook')).toBeInTheDocument()
  })

  it('gives the shapes to play under a capo', () => {
    useStore.getState().setCapo('Faith', 2)
    render(<Panel />)
    expect(within(facts()).getByText('Capo 2: play A shapes, sounds in B')).toBeInTheDocument()
  })

  it('gives the cue', () => {
    goTo('Papa Was a Rolling Stone')
    render(<Panel />)
    expect(within(facts()).getByText(song('Papa Was a Rolling Stone').cue!)).toBeInTheDocument()
  })

  it('the keyboard shows the book facts and no shapes', () => {
    useStore.getState().setInstrument('keyboard')
    useStore.getState().setCapo('Faith', 2)
    render(<Panel />)
    expect(facts()).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: /^Chord shapes/ })).toBeNull()
    expect(within(facts()).queryByText(/^Capo 2:/)).toBeNull()
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/tests/components/practice-panel.test.tsx`
Expected: FAIL. `Failed to resolve import "../../components/practice/PracticePanel"`.

- [ ] **Step 3: Write `app/src/components/practice/ShapeTiles.tsx`**

```tsx
import { useMemo } from 'react'
import { useChartView, useStore } from '../../store/use-store'
import { guitarFor, shownSections } from '../../music/chart-view'
import { strum } from '../../music/sound'
import { hasShapes, isPlayersShape, ownShapesFor, shapeText, voicingsFor } from '../../music/voicings'
import { shapeChoice, useBandPositions } from '../../hooks/use-band-positions'
import { clearSongShape, pickSongShape } from '../../store/song-shapes'
import type { SongChart } from '../../hooks/use-song-chart'
import { ChordDiagram } from '../diagrams/ChordDiagram'

interface Props {
  chart: SongChart
  /** The chord picked on the chart, or null for every chord in the song. */
  picked: string | null
  onPick: (chord: string | null) => void
}

/**
 * The song's chord shapes. With nothing picked: one tile per chord (of the
 * part tapped, if one is). With a chord picked: every shape of it, the one
 * used in this song marked; a tap makes another one this song's shape.
 */
export function ShapeTiles({ chart, picked, onPick }: Props) {
  const { song, songEdits, sections, capo } = chart
  const view = useChartView()
  const selectedVoicings = useStore(s => s.selectedVoicings)
  // Read so the tiles follow a shape the player writes or removes
  useStore(s => s.ownShapes)
  const clearVoicing = useStore(s => s.clearVoicing)
  const focusSection = useStore(s => s.focusSection)
  const setFocusSection = useStore(s => s.setFocusSection)
  const { picks: band, researched } = useBandPositions(song, songEdits)
  // A shape picked by hand wins; otherwise the song's band shape
  const choice = (name: string) => shapeChoice(name, songEdits, selectedVoicings, band[name])

  // The part tapped on the chart, if it belongs to this song
  const focus = useMemo(() => {
    if (!focusSection || focusSection.title !== song.title) return null
    const section = sections[focusSection.index]
    return section ? { index: focusSection.index, name: section.name } : null
  }, [focusSection, song, sections])

  // The shapes actually played: band key, less any capo, plain if asked for
  const chords = useMemo(() => {
    const shown = shownSections(song, songEdits, view)
    const seen = new Set<string>()
    const result: string[] = []
    for (const section of focus ? [shown[focus.index]] : shown) {
      for (const name of section.chords.split(/[\s|,]+/).filter(Boolean)) {
        if (!seen.has(name) && hasShapes(name)) {
          seen.add(name)
          result.push(name)
        }
      }
    }
    return result
  }, [song, songEdits, view, focus])

  if (picked) {
    const voicings = voicingsFor(picked)
    const own = ownShapesFor(picked)
    const listed = voicings.map((voicing, index) => ({ voicing, index })).filter(({ voicing }) => !voicing.wrong)
    const chosen = choice(picked)
    const useRecommended = () => {
      if (songEdits?.shapes?.[picked] !== undefined) clearSongShape(song.title, picked)
      else clearVoicing(picked)
    }
    return (
      <section className="shape-tiles">
        <div className="tiles-head">
          <h2 className="tiles-title">Shapes for {picked} &middot; {listed.length} of them</h2>
          <button className="sheet-action" onClick={() => onPick(null)}>All shapes</button>
        </div>
        <p className="tiles-hint">
          The recommended shape suits this song's sound and sits with its other chords. A shape you tap is used for {picked} in this song only.
        </p>
        {chosen.mine && (
          <button className="sheet-action" onClick={useRecommended}>Use the recommended shape</button>
        )}
        <div className="tiles" role="group" aria-label={`Shapes for ${picked}`}>
          {listed.map(({ voicing, index }) => {
            const text = shapeText(voicing)
            const yours = isPlayersShape(picked, text)
            const inSong = index === chosen.index
            return (
              <div
                key={index}
                role="button"
                tabIndex={0}
                className={inSong ? 'tile is-chosen' : 'tile'}
                aria-label={`${picked} at ${voicing.l}${yours ? ', yours' : ''}${index === band[picked] ? ', recommended' : ''}${inSong ? ', selected' : ''}`}
                // A shape the player wrote is picked by its text: it keeps meaning the same shape as the list changes
                onClick={() => pickSongShape(song.title, picked, own.includes(text) ? text : index)}
              >
                <ChordDiagram voicing={voicing} size={112} />
                <span className="tile-where">{voicing.l}</span>
                <span className="tile-frets">{text}</span>
                {inSong && <span className="diagram-mark is-recommended">In this song</span>}
                {yours && <span className="diagram-mark is-own">Yours</span>}
                <button
                  type="button"
                  className="diagram-play"
                  aria-label={`Play ${picked} at ${voicing.l}`}
                  onClick={e => {
                    e.stopPropagation()
                    strum(voicing, capo)
                  }}
                >
                  &#9654;
                </button>
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  const guitar = guitarFor(song, songEdits, view)
  return (
    <section className="shape-tiles">
      <div className="tiles-head">
        <h2 className="tiles-title">{focus ? `Shapes in ${focus.name}` : 'Shapes in this song'}</h2>
        {focus && (
          <button
            className="sheet-action"
            onClick={() => setFocusSection(null)}
            aria-label={`Showing ${focus.name} only. Show the whole song`}
          >
            All
          </button>
        )}
      </div>
      <div className="tiles" role="list" aria-label={focus ? `Chord shapes for ${focus.name}` : 'Chord shapes'}>
        {chords.map(name => {
          const { index } = choice(name)
          const voicing = voicingsFor(name)[index]
          if (!voicing) return null
          return (
            <div key={name} role="listitem" aria-label={name} className="tile" onClick={() => onPick(name)}>
              <span className="tile-name">{name}</span>
              <ChordDiagram voicing={voicing} size={112} />
              <span className="tile-where">{voicing.l}</span>
              <span className="tile-frets">{shapeText(voicing)}</span>
              {isPlayersShape(name, shapeText(voicing)) ? (
                <span className="diagram-mark is-own">Yours</span>
              ) : researched[name] !== undefined && index === researched[name] ? (
                // The shape the songbook or a lesson shows for this song
                <span className="diagram-mark is-researched">{song.shapesFrom ?? 'Researched'}</span>
              ) : band[name] !== undefined && index === band[name] ? (
                // Says which guitar it was chosen for, so the shape's style makes sense
                <span className="diagram-mark is-recommended">{guitar === 'electric' ? 'Electric' : 'Acoustic'}</span>
              ) : choice(name).mine ? (
                <span className="diagram-mark is-own">Your pick</span>
              ) : null}
              <button
                type="button"
                className="diagram-play"
                aria-label={`Play ${name}`}
                onClick={e => {
                  e.stopPropagation()
                  strum(voicing, capo)
                }}
              >
                &#9654;
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Write `app/src/components/practice/BookFacts.tsx`**

```tsx
import { useChartView } from '../../store/use-store'
import { guitarFor } from '../../music/chart-view'
import { songbookOf } from '../../music/songbook'
import type { SongChart } from '../../hooks/use-song-chart'

/** What the songbook and the song's notes say, under the shapes. */
export function BookFacts({ chart }: { chart: SongChart }) {
  const { song, songEdits, keyboard, capo } = chart
  const view = useChartView()
  const book = songbookOf(song)
  const guitar = guitarFor(song, songEdits, view)

  return (
    <section className="book-facts" aria-label="From the book and the notes">
      <h2 className="tiles-title">From the book and the notes</h2>
      <dl>
        <dt>Songbook</dt>
        <dd>{book !== undefined ? `George Michael Complete, no. ${book}` : 'Not in the songbook'}</dd>
        {!keyboard && (
          <>
            <dt>Shapes</dt>
            <dd>{song.shapesFrom ?? `Recommended for ${guitar} guitar`}</dd>
          </>
        )}
        <dt>Key</dt>
        <dd>
          {chart.playedKey}
          {song.lowerKey && (chart.lowerKey ? ' · LOWER KEY: the band plays it lower, set the key with − and +' : ' · the band plays it lower')}
          {capo > 0 && !keyboard && (
            <div className="facts-capo">Capo {capo}: play {chart.shapesKey} shapes, sounds in {chart.playedKey}</div>
          )}
        </dd>
        {song.cue && (
          <>
            <dt>Cue</dt>
            <dd>{song.cue}</dd>
          </>
        )}
      </dl>
      {chart.notes && <p className="chart-notes">{chart.notes}</p>}
    </section>
  )
}
```

- [ ] **Step 5: Write `app/src/components/practice/PracticePanel.tsx`**

```tsx
import type { SongChart } from '../../hooks/use-song-chart'
import { ShapeTiles } from './ShapeTiles'
import { BookFacts } from './BookFacts'

interface Props {
  chart: SongChart
  picked: string | null
  onPick: (chord: string | null) => void
}

/**
 * Beside the chart on its side, under it upright: the song's shapes, then
 * the book and the notes. The keyboard player gets the book and the notes only.
 */
export function PracticePanel({ chart, picked, onPick }: Props) {
  return (
    <aside className="practice-panel" aria-label="Shapes and the book">
      {!chart.keyboard && <ShapeTiles chart={chart} picked={picked} onPick={onPick} />}
      <BookFacts chart={chart} />
    </aside>
  )
}
```

- [ ] **Step 6: Append the panel rules** to the end of `app/src/styles/practice.css`

```css
/* ---------- The chart and the panel: panel under the chart upright, beside it on its side ---------- */
.practice-body { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.practice-panel {
  flex: none;
  height: 430px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
}
.tiles-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 12px; }
.tiles-title { margin: 0; font-size: 17px; font-weight: 800; }
.tiles-hint { margin: 4px 0 8px; color: var(--text-muted); font-size: 13px; }
.tiles { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px;
  border: 2px solid transparent;
  border-radius: 8px;
  background: var(--diagram-tile);
  color: var(--text);
  cursor: pointer;
}
.tile.is-chosen { border-color: #facc15; }
.tile-name { font-size: 14px; font-weight: 800; }
.tile-where { font-size: 11px; color: var(--text-muted); }
.tile-frets { font-size: 12px; color: var(--text-muted); font-variant-numeric: tabular-nums; }
.book-facts dl { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; margin: 8px 0 0; font-size: 15px; }
.book-facts dt { color: var(--text-muted); font-weight: 700; }
.book-facts dd { margin: 0; }
.facts-capo { margin-top: 2px; color: #f59e0b; font-weight: 700; }

/* A chord with shapes is a button on Practice: tap to pick it, tap again to let go */
button.chart-chord-tap { padding: 0; border: 0; background: none; color: inherit; font: inherit; text-decoration-style: dotted; }
.chart-chord-tap.is-picked { color: #facc15; text-decoration-color: #facc15; }

@media (orientation: landscape) and (min-width: 900px) {
  .practice-body { flex-direction: row; }
  .practice-panel { width: 420px; height: auto; border-top: none; border-left: 1px solid var(--border); }
  /* Practice keeps four bars a row on its side: the panel takes the room */
  .practice-screen .band-chart { --cols: 4; }
}
```

- [ ] **Step 7: Run the new test, the types and every test**

Run: `npx vitest run src/tests/components/practice-panel.test.tsx && npx tsc -b --noEmit && npx vitest run`
Expected: `15 passed`, no tsc output, then every test passes.

- [ ] **Step 8: Commit**

```bash
cd /Users/krys/Documents/coding/cheetsheetForGuitarPlaying && git status --short
git add app/src/components/practice/PracticePanel.tsx app/src/components/practice/ShapeTiles.tsx app/src/components/practice/BookFacts.tsx app/src/styles/practice.css app/src/tests/components/practice-panel.test.tsx
git commit -m "feat: the Practice panel, with the song's shapes and what the book says

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: The two screens in the app; the top bar goes

**Files:**
- Create: `app/src/components/practice/PracticeScreen.tsx`
- Modify (rewrite): `app/src/components/song/SongSheet.tsx` (Practice's chart only: read or edited)
- Modify: `app/src/components/song/ChartBody.tsx` (a chord with shapes is a button)
- Modify: `app/src/App.tsx` (the screen for the view mode; no top bar, no shapes strip)
- Modify: `app/src/store/view-settings.ts`, `app/src/store/persistence.ts` (the shapes-strip settings go)
- Modify: `app/src/styles/layout.css` (deletions only), `app/src/styles/bands.css` (one rule out)
- Delete: `app/src/components/layout/TopBar.tsx`, `app/src/components/layout/SongGrid.tsx`, `app/src/components/shared/TapTempo.tsx`, `app/src/components/diagrams/DiagramsBar.tsx`, `app/src/music/click.ts`
- Delete tests: `app/src/tests/components/top-bar.test.tsx`, `tap-tempo.test.tsx`, `diagrams-toggle.test.tsx`, `menu-placement.test.ts`, `band-shapes.test.tsx`, `app/src/tests/music/click.test.ts`
- Port tests: `band-chart`, `capo-and-simple`, `chord-finder`, `keyboard-view`, `move-chords-sheet`, `original-chart`, `saving-ui`, `section-focus`, `song-order`, `stage-polish`, `chart-styles` (all in `app/src/tests/components/`), `app/src/tests/store/view-settings.test.ts`
- Test: `app/src/tests/components/screens.test.tsx` (new)

**Interfaces:**
- Consumes: `StageScreen` (Task 8); `PracticeHeader` (Task 9); `PracticePanel` (Task 10); `useSongChart`, `ChartBody`, `EmptyList`, `useChartFit` (Task 7); `useShownSong()` (Task 3); `BottomBar` (Tasks 4 to 6).
- Produces:
  - `PracticeScreen()`: `main[aria-label="Practice"].practice-screen`: the header, then `div.practice-body` with the chart (`SongSheet`) and, unless editing, the panel. It holds the chord picked on the chart; a new song lets go of it.
  - `SongSheet({ picked?: string | null, onPick?: (chord: string) => void })`: with no `onPick`, no chord reacts to a tap.
  - `CurrentScreen()`, exported from `App.tsx`: `StageScreen` when the view mode is `'stage'`, else `PracticeScreen`.
  - A chord with shapes on Practice: `button.chart-chord-tap[aria-pressed]`, `is-picked` while picked.
  - `ViewSettings` no longer has `diagramsVisible`, `stageDiagramsVisible` or `toggleDiagrams`; `shapesShown` is gone.

The old tests that tested the top bar, the menu, the song grid and the shapes strip were ported into the new tests of Tasks 6, 8, 9 and 10. This task deletes the old ones and points the rest at the new screens. Every rule is listed below; if a test fails for a reason not listed, stop and record it as a ruling in the ledger rather than changing what it checks.

- [ ] **Step 1: Write the failing test** at `app/src/tests/components/screens.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { CurrentScreen } from '../../App'
import { BottomBar } from '../../components/layout/BottomBar'
import { PracticeScreen } from '../../components/practice/PracticeScreen'
import { GIG_SETLIST_2026 as G } from '../../data/songs'
import { useStore } from '../../store/use-store'
import { setOwnShapes } from '../../music/voicings'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
  setOwnShapes({})
})

function Screens() {
  return (
    <>
      <CurrentScreen />
      <BottomBar />
    </>
  )
}

const button = (name: string | RegExp) => screen.getByRole('button', { name })
/** A chord on the chart, by name (the panel's tiles are list items, not buttons). */
const chartChord = (name: string) => screen.getAllByRole('button', { name })[0]
const goTo = (title: string) => act(() => useStore.getState().goToSong(G.indexOf(title)))

describe('the two screens', () => {
  it('opens on Practice, and the bar switches to Stage and back', () => {
    render(<Screens />)
    expect(screen.getByRole('main', { name: 'Practice' })).toBeInTheDocument()
    fireEvent.click(button('Switch to Stage'))
    expect(screen.getByRole('main', { name: 'Stage' })).toBeInTheDocument()
    expect(useStore.getState().viewMode).toBe('stage')
    fireEvent.click(button('Switch to Practice'))
    expect(screen.getByRole('main', { name: 'Practice' })).toBeInTheDocument()
  })

  it('switching to Stage while editing shows Stage with no editor', () => {
    useStore.setState({ editMode: true })
    render(<Screens />)
    expect(screen.getByRole('group', { name: 'Chord keyboard' })).toBeInTheDocument()
    fireEvent.click(button('Switch to Stage'))
    expect(screen.getByRole('main', { name: 'Stage' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Chord keyboard' })).toBeNull()
    expect(useStore.getState().editMode).toBe(false)
  })

  it('shows the tempo saved on the device, as text, on both screens', () => {
    useStore.getState().saveBpm('Faith', 101) // the song data says 96
    render(<Screens />)
    expect(screen.getByText('101 BPM')).toBeInTheDocument()
    fireEvent.click(button('Switch to Stage'))
    expect(screen.getByText('101 BPM')).toBeInTheDocument()
  })

  it('has no top bar and no shapes strip', () => {
    const { container } = render(<Screens />)
    expect(container.querySelector('.topbar')).toBeNull()
    expect(container.querySelector('.diagrams-strip')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull()
  })
})

describe('picking a chord on Practice', () => {
  it('a tap picks it and the panel shows its shapes; a second tap lets go', () => {
    render(<PracticeScreen />) // Faith
    fireEvent.click(chartChord('B'))
    expect(chartChord('B')).toHaveAttribute('aria-pressed', 'true')
    expect(chartChord('B').classList.contains('is-picked')).toBe(true)
    expect(screen.getByRole('heading', { name: /^Shapes for B · \d+ of them$/ })).toBeInTheDocument()
    fireEvent.click(chartChord('B'))
    expect(chartChord('B')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('heading', { name: 'Shapes in this song' })).toBeInTheDocument()
  })

  it('a shape of your own picked from a chord on the chart becomes the song’s shape', () => {
    const OWN = '0-x-6-4-0-0'
    useStore.getState().addOwnShape('E', OWN)
    render(<PracticeScreen />)
    fireEvent.click(chartChord('E'))
    fireEvent.click(button('E at 4th fret, yours'))
    expect(useStore.getState().edits.Faith?.shapes?.E).toBe(OWN)
  })

  it('lets go of the chord when the song changes', () => {
    render(<PracticeScreen />)
    fireEvent.click(chartChord('B'))
    act(() => useStore.getState().nextSong())
    expect(screen.getByRole('heading', { name: 'Shapes in this song' })).toBeInTheDocument()
  })

  it('has no panel while editing: the chord keyboard takes its place', () => {
    useStore.setState({ editMode: true })
    render(<PracticeScreen />)
    expect(screen.queryByRole('complementary', { name: 'Shapes and the book' })).toBeNull()
    expect(screen.getByRole('group', { name: 'Chord keyboard' })).toBeInTheDocument()
  })
})

describe('positions', () => {
  it('the Songs sheet lists every song with its recommended position', () => {
    render(<BottomBar />)
    fireEvent.click(button(/^Songs, /))
    const positions = within(screen.getByRole('dialog', { name: 'All songs' })).getAllByLabelText(/^Recommended position: /)
    expect(positions).toHaveLength(21)
    for (const p of positions) expect(p.textContent).toMatch(/^(Frets \d+–\d+|Open position|Open to fret \d+)$/)
  })

  it('calls the acoustic song open position', () => {
    goTo('Waiting (Reprise)')
    render(<PracticeScreen />)
    expect(button('Recommended position: open position. Move the chords')).toHaveTextContent('Open position')
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/tests/components/screens.test.tsx`
Expected: FAIL. `Failed to resolve import "../../components/practice/PracticeScreen"`, and `CurrentScreen` is not exported from `App`.

- [ ] **Step 3: Make a chord with shapes a button.** In `app/src/components/song/ChartBody.tsx`, replace the `return ( <span key={i} className={token === picked ? ...} ... </span> )` at the end of `renderTokens` with:

```tsx
      return (
        <button
          key={i}
          type="button"
          className={token === picked ? 'chart-chord-tap is-picked' : 'chart-chord-tap'}
          aria-pressed={token === picked}
          onClick={e => {
            e.stopPropagation()
            onChord(token)
          }}
        >
          {chordText(token)}
        </button>
      )
```

- [ ] **Step 4: Rewrite `app/src/components/song/SongSheet.tsx`.** The title line, the banners, the notes, Move chords and the old shape picker have moved to the Practice header and panel.

```tsx
import { useLayoutEffect, useRef } from 'react'
import { useStore } from '../../store/use-store'
import { keySpelling, shouldUseFlats, transposeText } from '../../music/theory'
import { normalizeChordText } from '../../music/chord-text'
import { pickSongShape } from '../../store/song-shapes'
import { useShownSong } from '../../hooks/use-shown-song'
import { useSongChart } from '../../hooks/use-song-chart'
import { useChartFit } from '../../hooks/use-chart-fit'
import { useSwipe } from '../../hooks/use-swipe'
import { ChartEditor } from '../edit/ChartEditor'
import { ChartBody } from './ChartBody'
import { EmptyList } from './EmptyList'

interface Props {
  /** The chord picked on the chart, drawn as picked. */
  picked?: string | null
  /** A chord with shapes is a button that picks it. Without this, chords are plain. */
  onPick?: (chord: string) => void
}

/**
 * Practice's chart: read, with a part's name picking the part for the panel's
 * shapes, or edited in place with the chord keyboard under it.
 */
export function SongSheet({ picked = null, onPick }: Props) {
  const { song } = useShownSong()
  const chart = useSongChart(song)
  const editMode = useStore(s => s.editMode)
  const focusSection = useStore(s => s.focusSection)
  const setFocusSection = useStore(s => s.setFocusSection)
  const saveSections = useStore(s => s.saveSections)
  const saveNotes = useStore(s => s.saveNotes)
  const saveForm = useStore(s => s.saveForm)
  const nextSong = useStore(s => s.nextSong)
  const prevSong = useStore(s => s.prevSong)

  const scrollRef = useRef<HTMLDivElement>(null)
  const fitRef = useRef<HTMLDivElement>(null)
  const sectionsRef = useRef<HTMLDivElement>(null)

  const fitKey = chart ? JSON.stringify([chart.fitKey, 'practice']) : ''
  useChartFit(scrollRef, fitRef, sectionsRef, fitKey, { bands: chart?.bands ?? false, enabled: !!chart && !editMode })

  // Every song opens at its top, not as far down as the last one was scrolled
  const songTitle = song?.title
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [songTitle])

  // Swipe only on the chart itself, never while editing.
  useSwipe(scrollRef, { onSwipeLeft: nextSong, onSwipeRight: prevSong }, !editMode)

  if (!chart) {
    return (
      <div ref={scrollRef} className="chart-scroll">
        <EmptyList />
      </div>
    )
  }

  const { song: shown } = chart

  // The reverse move, so an edit keeps the chart's own spelling (Bb7 in D is Cb7 in Eb)
  const toSourcePitch = (text: string) => {
    if (!chart.shift) return text
    const { letterShift } = keySpelling(chart.sourceKey, chart.shift)
    return transposeText(text, -chart.shift, shouldUseFlats(chart.sourceKey, 0), letterShift === undefined ? undefined : -letterShift)
  }

  // Chord edits arrive as shown on screen and are stored at the song's own pitch.
  const updateChordsAt = (index: number, chords: string) => {
    // Tidy first: Return is a line break, never a join, and stray spaces go
    const atSource = toSourcePitch(normalizeChordText(chords))
    saveSections(shown.title, chart.sections.map((sec, i) => (i === index ? { ...sec, chords: atSource } : sec)))
  }

  if (editMode) {
    return (
      // The chart itself, editable, with the chord keyboard under it. The
      // title, the key and Done are in the header above.
      <ChartEditor
        // Undo, the cursor and the rest belong to one song: a new song starts a new editor
        key={shown.title}
        title={shown.title}
        heading={null}
        banners={null}
        sections={chart.sections}
        displaySections={chart.displaySections}
        form={chart.form}
        songKey={chart.shapesKey}
        capo={chart.capo}
        notes={chart.notes}
        onChords={updateChordsAt}
        onSections={next => saveSections(shown.title, next)}
        onNotes={text => saveNotes(shown.title, text)}
        onForm={next => saveForm(shown.title, next)}
        onShape={(chord, pick) => pickSongShape(shown.title, chord, pick)}
      />
    )
  }

  return (
    <div ref={scrollRef} className="chart-scroll">
      <div ref={fitRef} className={chart.bands ? 'chart band-chart' : 'chart'}>
        <ChartBody
          chart={chart}
          sectionsRef={sectionsRef}
          onChord={onPick}
          picked={picked}
          focus={{
            index: focusSection?.title === shown.title ? focusSection.index : null,
            onFocus: index => setFocusSection(index === null ? null : { title: shown.title, index }),
          }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Write `app/src/components/practice/PracticeScreen.tsx`**

```tsx
import { useState } from 'react'
import { useStore } from '../../store/use-store'
import { useShownSong } from '../../hooks/use-shown-song'
import { useSongChart } from '../../hooks/use-song-chart'
import { SongSheet } from '../song/SongSheet'
import { PracticeHeader } from './PracticeHeader'
import { PracticePanel } from './PracticePanel'

/**
 * For home and rehearsal: the header with the song's setup, the chart (which
 * may scroll), and the panel with the shapes and the book. While editing, the
 * chord keyboard under the chart takes the panel's place.
 */
export function PracticeScreen() {
  const { song, extraFrom } = useShownSong()
  const chart = useSongChart(song)
  const editMode = useStore(s => s.editMode)
  // The chord picked on the chart belongs to its song: a new song lets go of it
  const [picked, setPicked] = useState<{ title: string; chord: string } | null>(null)
  const pickedChord = picked && song && picked.title === song.title ? picked.chord : null
  const pick = (chord: string | null) => setPicked(chord && song ? { title: song.title, chord } : null)

  return (
    <main className={editMode ? 'practice-screen is-editing' : 'practice-screen'} aria-label="Practice">
      {chart && <PracticeHeader chart={chart} extraFrom={extraFrom} />}
      <div className="practice-body">
        {/* A second tap on the picked chord lets go of it */}
        <SongSheet picked={pickedChord} onPick={chord => pick(chord === pickedChord ? null : chord)} />
        {chart && !editMode && <PracticePanel chart={chart} picked={pickedChord} onPick={pick} />}
      </div>
    </main>
  )
}
```

- [ ] **Step 6: Put the screens in `app/src/App.tsx`**
  - Replace the three imports of `TopBar`, `SongSheet` and `DiagramsBar` with:

```tsx
import { StageScreen } from './components/stage/StageScreen'
import { PracticeScreen } from './components/practice/PracticeScreen'
```

  - Above `function AppInner() {` add:

```tsx
/** Stage or Practice: two screens with different jobs, never one screen with things hidden. */
export function CurrentScreen() {
  const onStage = useStore(s => s.viewMode === 'stage')
  return onStage ? <StageScreen /> : <PracticeScreen />
}
```

  - In `AppInner`'s returned JSX, delete `<TopBar />`, and replace from `<SongSheet />` down to `{!editMode && <DiagramsBar />}` (with its comment) by `<CurrentScreen />`. The rest stays: the read-only banner, `<BottomBar />` and the toast.
  - Change the comment above `usePedalKeys` to `// Page-turner pedal / keyboard. Swipe lives on each screen's chart.`

- [ ] **Step 7: Delete the old parts**

```bash
cd /Users/krys/Documents/coding/cheetsheetForGuitarPlaying/app
git rm src/components/layout/TopBar.tsx src/components/layout/SongGrid.tsx src/components/shared/TapTempo.tsx src/components/diagrams/DiagramsBar.tsx src/music/click.ts
git rm src/tests/components/top-bar.test.tsx src/tests/components/tap-tempo.test.tsx src/tests/components/diagrams-toggle.test.tsx src/tests/components/menu-placement.test.ts src/tests/components/band-shapes.test.tsx src/tests/music/click.test.ts
grep -rn "TopBar\|SongGrid\|TapTempo\|DiagramsBar\|music/click" src
```

Expected from the grep: no import of any of them. A comment that still names one is reworded. (`band-shapes.test.tsx` was ported whole: the tile tests to Task 10, the title-line position to Task 9, the list positions, the acoustic position and the own shape from the chart to Step 1 here.)

- [ ] **Step 8: Remove the shapes-strip settings.** Stage has no shapes and Practice always shows them; the saved values are simply no longer read.
  - In `app/src/store/view-settings.ts`:
    - In `interface ViewSettings` delete `diagramsVisible: boolean`, the `stageDiagramsVisible` line with its comment, and `toggleDiagrams: () => void`.
    - In `viewSettings(...)` delete `diagramsVisible: true,`, `stageDiagramsVisible: false,` and the whole `toggleDiagrams: () => { ... },` member.
    - Delete `shapesShown` and its comment.
    - In `readViewSettings`, drop `getDiagramsVisible()` and `getSetting<boolean>('stageDiagramsVisible')` from the `Promise.all` and from the destructuring, drop their two spread lines, and drop `'diagramsVisible' | 'stageDiagramsVisible' | ` from the return type.
    - The import becomes `import { saveTheme, saveSetting, getSetting, getTheme } from './persistence'`.
  - In `app/src/store/persistence.ts` delete `saveDiagramsVisible` and `getDiagramsVisible` (about lines 114-122).
  - In `app/src/tests/store/view-settings.test.ts` delete the `describe('the shapes strip on stage', ...)` block and the `shapesShown` import.

- [ ] **Step 9: Delete the dead CSS.** In `app/src/styles/layout.css` delete these rules and nothing else (they styled only the deleted parts):
  - `/* ---------- Top bar ---------- */` and the rules for `.topbar`, `.tb-group`, `.tb-menu`, `.tb-break`, `.tb-meta`, `.tb-num`, `.tb-badge`, `.tb-badge.is-warn`, `.tb-badge.is-danger`, `.menu`, `.menu-item` (both rules), `.menu-foot`, and the `@media (max-width: 700px)` block that follows them (it holds only top-bar rules).
  - The rules for `.diagrams-focus`, `.diagrams-focus-all`, `.diagrams-hide` (both rules), `.diagrams-collapsed`, and the last rule of the file, `.chart-scroll[data-cramped] ~ .diagrams-strip svg`.
  - `/* ---------- Song navigation (bottom) ---------- */` with every `.songnav…` rule and the `@media (max-width: 500px)` block that holds only `.songnav…` rules.
  - From `/* ---------- All-songs grid ---------- */`: `.songgrid-screen`, `.songgrid-header`, `.songgrid-title`, `.songgrid-count`, its `@media` block, `.songgrid-body` and `.songgrid`. Keep `.songgrid-close` (the setlist editor, the saved charts and the history dialogs use it) and every `.songtile…` and `.chip…` rule (the Songs sheet uses them).
  - `/* ---------- Next-song heads-up ---------- */` with the three `.songnav-headsup…` rules.
  - Keep `.tb-btn` and its variants (the setlist editor and the empty list use them), `.tb-save…` (SaveStatus), `.chart-head`, `.chart-title`, `.chart-position`, `.chart-preset`, `.chart-cue` and the rest of the chart rules (`chart-styles.test.ts` pins three of their sizes).

  In `app/src/styles/bands.css` delete the `/* ---------- On stage ---------- */` comment and its rule `body.stage .diagrams-collapsed { font-size: 16px; }`.

  Then check: `grep -n "topbar\|tb-menu\|tb-badge\|songnav\|diagrams-" src/styles/*.css` prints nothing.

- [ ] **Step 10: Port the old tests.** Each file below changes only as listed. `PracticeScreen` comes from `'../../components/practice/PracticeScreen'`, `StageScreen` from `'../../components/stage/StageScreen'`.

  **`band-chart.test.tsx`**
  - Import `PracticeScreen`.
  - In "letters the song order the same way, with the full names" and "shows a part played twice running once, with its count", render `<PracticeScreen />` instead of `<SongSheet />` (the song order is in the header now).
  - Delete "has plain headers while the shapes are hidden".
  - In "draws an alteration a little smaller, and a tap on it still opens the whole chord", render `<PracticeScreen />`, and replace the last line with `expect(screen.getByRole('heading', { name: /^Shapes for Bb7\(b9\) · \d+ of them$/ })).toBeInTheDocument()`. Rename it "draws an alteration a little smaller, and a tap on it still picks the whole chord".
  - Everything else stays (Task 12 changes "the size of a band chart").

  **`capo-and-simple.test.tsx`**
  - Remove the `TopBar` import; import `PracticeScreen`.
  - In "shows the shapes to play: Faith in B with a capo on 2 is played in A shapes", render `<PracticeScreen />` (the capo line is in the panel's book facts).
  - Delete "is picked from the top bar, which marks the easiest one" (now in practice-header), the whole `describe('acoustic or electric', ...)` (practice-header and bar-sheets), and "is switched on from the menu" (bar-sheets).

  **`chord-finder.test.tsx`**
  - Remove the `TopBar` import and delete `describe('the chord finder in the menu', ...)` (bar-sheets has "opens from the bar and closes again").

  **`keyboard-view.test.tsx`**: replace the whole file with:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { SongSheet } from '../../components/song/SongSheet'
import { PracticeScreen } from '../../components/practice/PracticeScreen'
import { BottomBar } from '../../components/layout/BottomBar'
import { useStore } from '../../store/use-store'
import { faithOneLine } from '../faith-one-line'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
  faithOneLine()
})

const chords = () => screen.getAllByText((_, el) => el?.className === 'chart-chords')
const verse = () => chords()[1].textContent

// The instrument setting is in the More sheet (bar-sheets.test.tsx); the
// Keyboard badge in the setup row is in practice-header.test.tsx.
describe('the keyboard view', () => {
  beforeEach(() => {
    useStore.getState().setInstrument('keyboard')
  })

  it("shows the chords as they sound, whatever capo the guitarist has on", () => {
    useStore.getState().setCapo('Faith', 2)
    render(<SongSheet />)
    expect(verse()).toBe('B  E  B  E  B')
    expect(screen.queryByText(/^Capo 2:/)).toBeNull()
  })

  it('keeps the capo for the guitarist: switching back shows the shapes again', () => {
    useStore.getState().setCapo('Faith', 2)
    const { rerender } = render(<PracticeScreen />)
    useStore.getState().setInstrument('guitar')
    rerender(<PracticeScreen />)
    expect(verse()).toBe('A  D  A  D  A')
    expect(screen.getByText('Capo 2: play A shapes, sounds in B')).toBeInTheDocument()
  })

  it('shows no shapes, no neck position and no guitar sound', () => {
    const { container } = render(<PracticeScreen />)
    expect(screen.queryByRole('list', { name: /^Chord shapes/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Move the chords/ })).toBeNull()
    expect(screen.queryByLabelText(/^GX-10 sound/)).toBeNull()
    // Chords and section names are plain text: nothing to pick a shape for
    expect(container.querySelector('.chart-chord-tap')).toBeNull()
    expect(container.querySelector('.chart-label-btn')).toBeNull()
    expect(container.querySelector('.chart-label')?.textContent).toBe('Intro')
  })

  it('simplifies to plain chords even on an electric song', () => {
    useStore.getState().saveSections('Faith', [{ name: 'Verse', chords: 'Bmaj7  E9  C#m7' }])
    useStore.getState().toggleSimpleChords()
    render(<SongSheet />)
    expect(chords()[0].textContent).toBe('B  E  C#m')
  })

  it('leaves the GX-10 preset off the song list and the Next button', () => {
    const songs = useStore.getState().setlistSongs()
    const withPreset = songs.findIndex((s, i) => i > 0 && songs[i - 1] && s.preset)
    useStore.getState().goToSong(withPreset - 1)
    const { container } = render(<BottomBar />)
    expect(container.querySelector('.bb-preset')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /^Songs, / }))
    const sheet = screen.getByRole('dialog', { name: 'All songs' })
    expect(within(sheet).queryByLabelText(/^Recommended position/)).toBeNull()
    expect(within(sheet).getByText('Faith')).toBeInTheDocument()
  })
})
```

  **`move-chords-sheet.test.tsx`**
  - Replace the `DiagramsBar` import with `import { StageScreen } from '../../components/stage/StageScreen'`, and the `SongSheet` import with the `PracticeScreen` import.
  - In the first three tests render `<PracticeScreen />` instead of `<SongSheet />`. Rename the describe to "moving the chords from the setup row" and "shows a moved song as yours on the title line" to "shows a moved song as yours".
  - Replace "is not a button on stage, where nothing on the chart changes" with:

```tsx
  it('is not on Stage at all, where nothing about the song changes', () => {
    useStore.setState({ viewMode: 'stage' })
    render(<StageScreen />)
    expect(screen.queryByRole('button', { name: /Move the chords/ })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/position/)).not.toBeInTheDocument()
  })
```

  - Delete "has left the chord diagrams, which keep their whole strip for the shapes".

  **`original-chart.test.tsx`**
  - Import `PracticeScreen` and `StageScreen` instead of `SongSheet`.
  - Render `<PracticeScreen />` wherever it rendered `<SongSheet />`, except in "on stage, where nothing on the chart should change", which renders `<StageScreen />`.

  **`saving-ui.test.tsx`**
  - Remove the `TopBar` and `SongGrid` imports; import `PracticeScreen` and `import { BottomBar } from '../../components/layout/BottomBar'`.
  - Under the imports add:

```tsx
/** The setup row, where the save status sits beside Done. */
const setup = () => screen.getByRole('group', { name: 'Song setup' })
/** The Songs sheet, opened from the bar. */
const openSongs = () => {
  render(<BottomBar />)
  fireEvent.click(screen.getByRole('button', { name: /^Songs, / }))
  return screen.getByRole('dialog', { name: 'All songs' })
}
```

  - In `describe('the save status while editing', ...)`: render `<PracticeScreen />` wherever it rendered `<TopBar />`; replace `screen.getByRole('status')` with `within(setup()).getByRole('status')` and `screen.queryByRole('status')` with `within(setup()).queryByRole('status')`.
  - In `describe('EDITED in the song lists', ...)`: delete `const songs = ...`. The first test becomes:

```tsx
  it('marks a song that shows the player\'s own chords, and only that song', () => {
    useStore.setState({ edits: { Faith: { sections: [{ name: 'Verse', chords: 'B  A' }] } } })
    const sheet = openSongs()
    expect(within(within(sheet).getByText('Faith').closest('button')!).getByText('EDITED')).toBeInTheDocument()
    expect(within(within(sheet).getByText('Roxanne').closest('button')!).queryByText('EDITED')).not.toBeInTheDocument()
  })
```

    and in the other two, replace `render(<SongGrid songs={songs} onClose={() => {}} />)` with `openSongs()`.
  - The rest stays (it renders `SongSheet` in edit mode or `SongHistoryModal`).

  **`section-focus.test.tsx`**
  - Replace the `SongSheet` and `DiagramsBar` imports with the `PracticeScreen` import, and `renderChart` with `const renderChart = () => render(<PracticeScreen />)`.
  - Rename "can be undone from the diagrams bar too" to "can be undone from the panel too".
  - Delete "leaves plain labels when the diagrams are hidden".

  **`song-order.test.tsx`**
  - Import `PracticeScreen` and `StageScreen`.
  - In `describe('the song order on the chart', ...)` render `<PracticeScreen />` instead of `<SongSheet />`, except "is on the stage chart too", which renders `<StageScreen />` (its ten chips are letters there; the count is the same). Rename the describe to "the song order in the header".
  - In "starts an order for a song that had none, and it shows on the chart afterwards", render `<PracticeScreen />`, and rename it "…, and it shows in the header afterwards".
  - The rest stays on `SongSheet` in edit mode.

  **`stage-polish.test.tsx`**: replace the whole file with:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BottomBar } from '../../components/layout/BottomBar'
import { SongSheet } from '../../components/song/SongSheet'
import { StageScreen } from '../../components/stage/StageScreen'
import { useStore } from '../../store/use-store'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})

const open = (title: string) => {
  const { setlistData } = useStore.getState()
  useStore.getState().goToSong(setlistData.lists[setlistData.activeId].songTitles.indexOf(title))
}
const sound = () => screen.getByLabelText(/^GX-10 sound: /)

// Tap tempo is gone: the BPM is text (screens.test.tsx). Chord taps on Stage,
// the Next up line and the key button are in stage-screen.test.tsx and
// practice-header.test.tsx.

describe('GX-10 sound on Stage', () => {
  it('shows a solo switch on the tag, not in the cue', () => {
    open('Somebody to Love')
    const { container } = render(<StageScreen />)
    expect(sound()).toHaveTextContent('CRUNCH → LEAD solo')
    expect(container.querySelector('.stage-cue')).not.toHaveTextContent('LEAD')
  })

  it('sits on the title row, and a sound alone adds no cue line', () => {
    const { container } = render(<StageScreen />) // Faith: FUNK, no stage directions
    expect(sound()).toHaveTextContent('FUNK')
    expect(sound().closest('.stage-row')).toBe(container.querySelector('.stage-title')!.closest('.stage-row'))
    expect(container.querySelector('.stage-cue')).toBeNull()
  })

  it('leaves the stage directions in the cue', () => {
    open('Roxanne')
    const { container } = render(<StageScreen />)
    expect(sound()).toHaveTextContent('WARM JAZZ')
    expect(container.querySelector('.stage-cue')).toHaveTextContent(/^GUITAR TACET/)
  })
})

describe('chart marks', () => {
  it('draws "no chord" as a direction, not as a chord to play', () => {
    open('Papa Was a Rolling Stone')
    render(<SongSheet />)
    const marks = screen.getAllByText('N.C.')
    expect(marks.length).toBeGreaterThan(0)
    marks.forEach(mark => expect(mark).toHaveClass('chart-mark'))
    expect(screen.getAllByText('Bbm')[0]).not.toHaveClass('chart-mark')
  })

  it('draws a repeat count the same way, on Stage too', () => {
    open('Outside')
    useStore.setState({ viewMode: 'stage' })
    render(<StageScreen />)
    expect(screen.getByText('(x3)')).toHaveClass('chart-mark')
  })
})

describe('next song', () => {
  it('shows the key the band plays it in', () => {
    render(<BottomBar />)
    // Song 2 is I'm Your Man: charted in D, played in C
    const next = screen.getByRole('button', { name: /^Next song/ })
    expect(next.querySelector('.bb-key')).toHaveTextContent(/^C$/)
  })

  it('follows a transpose set on the device', () => {
    useStore.getState().setTranspose("I'm Your Man", -3)
    render(<BottomBar />)
    const next = screen.getByRole('button', { name: /^Next song/ })
    expect(next.querySelector('.bb-key')).toHaveTextContent(/^B$/)
  })

  it('names the GX-10 sound for the next song on the Next button', () => {
    useStore.setState({ currentIndex: 3 }) // Amazing; next is A Different Corner
    render(<BottomBar />)
    expect(screen.getByRole('button', { name: /^Next song/ })).toHaveTextContent('WARM JAZZ')
  })
})
```

  **`chart-styles.test.ts`**: delete "makes the shapes handle readable on stage".

- [ ] **Step 11: Run the new test, the types and every test**

Run: `npx vitest run src/tests/components/screens.test.tsx && npx tsc -b --noEmit && npx vitest run`
Expected: `10 passed`, no tsc output, then every test passes. A "Next up" failure recorded in the ledger at Task 4 is gone now: `stage-polish.test.tsx` was rewritten.

- [ ] **Step 12: Check the size rule and that nothing is left over**

Run: `wc -l src/styles/layout.css src/store/use-store.ts src/components/song/SongSheet.tsx && grep -rn "shapesShown\|toggleDiagrams\|diagramsVisible" src`
Expected: layout.css well under its 1133 lines, use-store.ts at most 795, SongSheet about 130; the grep prints nothing.

- [ ] **Step 13: Look at it.** Start the dev server (preview_start, or `npm run dev`) at 820 × 1180, then 1180 × 820. Practice: the header, the chart, the panel under it (beside it on its side); a chord tap turns it yellow and the panel shows its shapes. The bar's Stage button: Stage shows the header, the whole chart and the bar, and no chord reacts to a tap. Take a screenshot of each screen both ways for the review.

- [ ] **Step 14: Commit**

```bash
cd /Users/krys/Documents/coding/cheetsheetForGuitarPlaying && git status --short
git add -A app/src/components app/src/App.tsx app/src/store/view-settings.ts app/src/store/persistence.ts app/src/styles/layout.css app/src/styles/bands.css app/src/music app/src/tests
git status --short
git commit -m "feat: Stage and Practice are the app's two screens; the top bar, the menu and the shapes strip go

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

The second `git status --short` must show nothing staged outside `app/src` (never `app/tsconfig.tsbuildinfo` or `demo-form-pdf/`).

---

### Task 12: The fit rule, and each part's letter and name beside its bars

**Files:**
- Create: `app/src/hooks/fit-chart.ts`
- Modify: `app/src/hooks/use-chart-fit.ts` (a chart in bars uses the new rule)
- Modify: `app/src/components/song/BandChart.tsx` (the header line's rule goes)
- Modify (rewrite): `app/src/styles/bands.css`
- Test: `app/src/tests/hooks/fit-chart.test.tsx` (new); `app/src/tests/components/band-chart.test.tsx` ("the size of a band chart"); `app/src/tests/components/chart-styles.test.ts` ("the band chart stylesheet")

**Interfaces:**
- Consumes: `useFitText` (for charts not in bars, unchanged); the `.bar` and `.bar-chord` cells drawn by `BandBars`.
- Produces, in `hooks/fit-chart.ts`:
  - `MIN_CHORD_PX = 20`
  - `largestFit(fits: (px: number) => boolean, min: number, max: number): number`: `max` if it fits, `min` if not even `min` fits, else 8 halvings of the range, rounded down to 0.5 px.
  - `needsTwoLines(chords: number, px: number, scale: number): boolean`: two or more chords that, at size `px` shrunk by `scale` to fit their bar, would be drawn under 20 px.
  - `layOutBars(content: HTMLElement, px: number): void`: marks those bars `data-lines="2"`, then sets `--fit` on any bar still too narrow for its chords.
  - `useBandFit(containerRef, contentRef, contentKey: string, enabled: boolean): void`: reads `--chart-min` and `--chart-max` from the content's style (20 and 44 where unset), fits, and refits on resize.
- `useChartFit`'s signature does not change. Both screens get the same rule; only their space differs.
- CSS: `--gutter` on `.band-chart` (116 px; 44 px on Stage on its side, where the part's name is hidden), `.bar[data-lines='2']`.

- [ ] **Step 1: Write the failing test** at `app/src/tests/hooks/fit-chart.test.tsx`

```tsx
import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { largestFit, layOutBars, needsTwoLines, useBandFit } from '../../hooks/fit-chart'

describe('largestFit', () => {
  it('takes the largest size when everything fits', () => {
    expect(largestFit(() => true, 20, 44)).toBe(44)
  })

  it('stays at the smallest size when nothing fits, and the chart scrolls', () => {
    expect(largestFit(() => false, 20, 44)).toBe(20)
  })

  it('halves the range eight times and rounds down to half a pixel', () => {
    // Tries 32, 26, 29, 30.5, 31.25, 31.625, 31.4375, 31.34375: the last that fits is 31.25
    expect(largestFit(px => px <= 31.3, 20, 44)).toBe(31)
    // ... 27.6875 then 27.78125 fit: rounded down, 27.5
    expect(largestFit(px => px <= 27.8, 20, 44)).toBe(27.5)
  })

  it('works on the smaller range on its side', () => {
    expect(largestFit(px => px <= 30, 20, 36)).toBeLessThanOrEqual(30)
    expect(largestFit(px => px <= 30, 20, 36)).toBeGreaterThanOrEqual(29.5)
  })
})

describe('needsTwoLines', () => {
  it('only for two or more chords that would go under 20 px', () => {
    expect(needsTwoLines(2, 30, 0.6)).toBe(true) // 18 px
    expect(needsTwoLines(3, 30, 0.7)).toBe(false) // 21 px
    expect(needsTwoLines(1, 30, 0.5)).toBe(false) // one chord shrinks in its bar instead
    expect(needsTwoLines(2, 30, 1)).toBe(false)
  })
})

/** A bar `width` wide whose chords need `oneLine` px on one line and `twoLines` px on two. */
function fakeBar(chords: number, width: number, oneLine: number, twoLines: number) {
  const bar = document.createElement('div')
  bar.className = 'bar'
  for (let i = 0; i < chords; i++) {
    const chord = document.createElement('span')
    chord.className = 'bar-chord'
    bar.appendChild(chord)
  }
  Object.defineProperty(bar, 'clientWidth', { get: () => width })
  Object.defineProperty(bar, 'scrollWidth', { get: () => (bar.dataset.lines === '2' ? twoLines : oneLine) })
  return bar
}

describe('layOutBars', () => {
  it('puts a crowded bar on two lines, and leaves the others alone', () => {
    const content = document.createElement('div')
    const crowded = fakeBar(2, 100, 160, 90) // at 30 px: 30 × 0.62 = 18.6, under 20
    const roomy = fakeBar(2, 100, 100, 60)
    content.append(crowded, roomy)
    layOutBars(content, 30)
    expect(crowded.dataset.lines).toBe('2')
    expect(crowded.style.getPropertyValue('--fit')).toBe('')
    expect(roomy.dataset.lines).toBeUndefined()
  })

  it('shrinks one long chord in its own bar', () => {
    const content = document.createElement('div')
    const long = fakeBar(1, 100, 125, 125)
    content.append(long)
    layOutBars(content, 30)
    expect(long.dataset.lines).toBeUndefined()
    expect(long.style.getPropertyValue('--fit')).toBe('0.8')
  })

  it('still shrinks a bar that is too wide on two lines', () => {
    const content = document.createElement('div')
    const packed = fakeBar(4, 100, 250, 110)
    content.append(packed)
    layOutBars(content, 30)
    expect(packed.dataset.lines).toBe('2')
    expect(packed.style.getPropertyValue('--fit')).toBe('0.9')
  })

  it('starts again from one line at every size', () => {
    const content = document.createElement('div')
    const bar = fakeBar(2, 100, 160, 90)
    content.append(bar)
    layOutBars(content, 30)
    expect(bar.dataset.lines).toBe('2')
    layOutBars(content, 40) // 40 × 0.62 = 24.8: one line is fine now
    expect(bar.dataset.lines).toBeUndefined()
  })
})

/** jsdom has no layout: a 400 px tall screen and a chart `lines` lines tall. */
function fakeChart(lines: number) {
  const container = document.createElement('div')
  const content = document.createElement('div')
  const px = () => parseFloat(content.style.fontSize) || 0
  Object.defineProperty(container, 'clientHeight', { get: () => 400 })
  Object.defineProperty(container, 'clientWidth', { get: () => 300 })
  Object.defineProperty(container, 'scrollWidth', { get: () => 300 })
  Object.defineProperty(container, 'scrollHeight', { get: () => Math.max(400, px() * lines) })
  return { container: { current: container }, content: { current: content }, size: px }
}

describe('useBandFit', () => {
  it('fits the whole chart at the largest size that fits', () => {
    const chart = fakeChart(12) // fits up to 33.4 px
    renderHook(() => useBandFit(chart.container, chart.content, 'a', true))
    expect(chart.size()).toBe(33)
  })

  it('stays at 20 px and scrolls when the song cannot fit', () => {
    const chart = fakeChart(30)
    renderHook(() => useBandFit(chart.container, chart.content, 'a', true))
    expect(chart.size()).toBe(20)
  })

  it('takes its range from the stylesheet', () => {
    const chart = fakeChart(1)
    chart.content.current.style.setProperty('--chart-max', '36px')
    renderHook(() => useBandFit(chart.container, chart.content, 'a', true))
    expect(chart.size()).toBe(36)
  })

  it('does nothing when switched off', () => {
    const chart = fakeChart(12)
    renderHook(() => useBandFit(chart.container, chart.content, 'a', false))
    expect(chart.content.current.style.fontSize).toBe('')
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/tests/hooks/fit-chart.test.tsx`
Expected: FAIL. `Failed to resolve import "../../hooks/fit-chart"`.

- [ ] **Step 3: Write `app/src/hooks/fit-chart.ts`**

```ts
import { useLayoutEffect, type RefObject } from 'react'

/** No chord is drawn smaller than this, on either screen. */
export const MIN_CHORD_PX = 20
/** The largest size, where the stylesheet sets none (bands.css sets 44 upright, 36 on its side). */
const MAX_CHORD_PX = 44
/** Halvings of the size range: about a tenth of a pixel on 20 to 44. */
const STEPS = 8

/**
 * The largest size from `min` to `max` at which `fits` holds: `max` if it
 * fits, `min` if not even that fits (the chart then scrolls), otherwise found
 * by halving the range eight times and rounded down to half a pixel.
 */
export function largestFit(fits: (px: number) => boolean, min: number, max: number): number {
  if (fits(max)) return max
  if (!fits(min)) return min
  let lo = min
  let hi = max
  for (let i = 0; i < STEPS; i++) {
    const mid = (lo + hi) / 2
    if (fits(mid)) lo = mid
    else hi = mid
  }
  return Math.max(min, Math.floor(lo * 2) / 2)
}

/**
 * A bar of two or more chords goes on two lines when, on one line, its chords
 * would have to shrink under 20 px to fit it. A bar of one chord never does:
 * it shrinks in its bar instead.
 */
export function needsTwoLines(chords: number, px: number, scale: number): boolean {
  return chords >= 2 && px * scale < MIN_CHORD_PX
}

/** How much a cell must shrink for its content to fit it, 1 when it fits. */
function scaleOf(cell: HTMLElement): number {
  return cell.clientWidth > 0 && cell.scrollWidth > cell.clientWidth + 1
    ? Math.floor((cell.clientWidth / cell.scrollWidth) * 100) / 100
    : 1
}

/**
 * Lays out every bar for the size set: first each on one line, then the
 * crowded ones on two lines, then any bar still too narrow for its chords
 * scaled down in that bar alone (`--fit`, which the stylesheet turns into
 * zoom). Reads every bar before writing any, so the page is laid out once a pass.
 */
export function layOutBars(content: HTMLElement, px: number): void {
  const bars = [...content.querySelectorAll<HTMLElement>('.bar')]
  for (const bar of bars) {
    bar.style.removeProperty('--fit')
    delete bar.dataset.lines
  }
  const oneLine = bars.map(scaleOf)
  bars.forEach((bar, i) => {
    if (needsTwoLines(bar.querySelectorAll('.bar-chord').length, px, oneLine[i])) bar.dataset.lines = '2'
  })
  const after = bars.map(scaleOf)
  bars.forEach((bar, i) => {
    if (after[i] < 1) bar.style.setProperty('--fit', String(after[i]))
  })
}

/** A px custom property from the content's style, or `otherwise` where it is not set. */
function cssPx(content: HTMLElement, name: string, otherwise: number): number {
  const value = parseFloat(getComputedStyle(content).getPropertyValue(name))
  return Number.isNaN(value) ? otherwise : value
}

/**
 * Sizes a chart in bars: the largest chord size at which the whole chart fits
 * its container, from `--chart-min` to `--chart-max`, with crowded bars on
 * two lines. A chart that cannot fit at the smallest size stays there and
 * scrolls. Rotating the iPad (a new container size, a new range from the
 * stylesheet) refits through a ResizeObserver.
 */
export function useBandFit(
  containerRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
  contentKey: string,
  enabled: boolean,
): void {
  useLayoutEffect(() => {
    const container = containerRef.current
    const content = contentRef.current
    if (!enabled || !container || !content) return

    const fits = () =>
      container.scrollHeight <= container.clientHeight + 1 &&
      container.scrollWidth <= container.clientWidth + 1
    const apply = (px: number) => {
      content.style.fontSize = `${px}px`
      layOutBars(content, px)
    }
    const fit = () => {
      const min = cssPx(content, '--chart-min', MIN_CHORD_PX)
      const max = cssPx(content, '--chart-max', MAX_CHORD_PX)
      apply(largestFit(px => { apply(px); return fits() }, min, max))
    }

    // Left from a chart not in bars, it would keep this one's lines from wrapping
    delete content.dataset.wrap
    fit()

    if (typeof ResizeObserver === 'undefined') return
    // Observing the container, not the content: its size does not depend on
    // the font size, so refitting here cannot loop.
    const observer = new ResizeObserver(() => fit())
    observer.observe(container)
    return () => observer.disconnect()
  }, [containerRef, contentRef, contentKey, enabled])
}
```

- [ ] **Step 4: Use it for charts in bars.** Replace all of `app/src/hooks/use-chart-fit.ts` with:

```ts
import type { RefObject } from 'react'
import { useFitText } from './use-fit-text'
import { useBandFit } from './fit-chart'

/** A chart not in bars (a song typed in by hand): text never goes below this — it scrolls instead. */
const MIN_CHART_PX = 20
/** Upper bound so a two-chord song does not become a wall of letters. */
const MAX_CHART_PX = 64
/** Keep progressions on one line if that still gives at least this size. */
const NO_WRAP_MIN_PX = 30

/**
 * Fits the chart to its screen. A chart in bars: the same rule on Stage and
 * Practice (fit-chart.ts), only the space differs. A chart not in bars keeps
 * the older text fit.
 */
export function useChartFit(
  scrollRef: RefObject<HTMLElement | null>,
  fitRef: RefObject<HTMLElement | null>,
  sectionsRef: RefObject<HTMLElement | null>,
  fitKey: string,
  { bands, enabled }: { bands: boolean; enabled: boolean },
): void {
  useBandFit(scrollRef, fitRef, fitKey, enabled && bands)
  useFitText(scrollRef, fitRef, fitKey, {
    min: MIN_CHART_PX,
    max: MAX_CHART_PX,
    preferNoWrapMin: NO_WRAP_MIN_PX,
    enabled: enabled && !bands,
    // A long chart keeps its chords on screen; anything under them can scroll
    essentialRef: sectionsRef,
  })
}
```

- [ ] **Step 5: Take the rule out of the band's header.** In `app/src/components/song/BandChart.tsx`:
  - Delete the line `<span className="band-rule" aria-hidden="true" />`.
  - Change the component's comment to:

```tsx
/**
 * A chart in bands: each section a band tinted in its colour, its letter
 * (A, B, C in chart order) and name in a gutter beside its bars.
 */
```

- [ ] **Step 6: Replace all of `app/src/styles/bands.css` with:**

```css
/* ---------- A chart in bands (3.64.0; beside its bars since 4.0.0) ----------
   A chart written in bars: each section a band in its colour, lettered A, B, C
   in chart order, the letter and the part's name in a gutter beside its bars.
   The bars sit in a grid of four columns (eight on Stage on its side, two on
   a phone). Every written line is padded to four cells, so bar 1 of every
   line is in the first column. The fit (hooks/fit-chart.ts) reads --chart-min
   and --chart-max from here on every fit, so turning the iPad picks up the
   other range. */
.band-chart {
  --cols: 4;
  --chart-min: 20px;
  --chart-max: 44px;
  --gutter: 116px;
  --band-gap: 12px;
  --row-gap: 5px;
  --letter-box: 26px;
  --chip-size: 17px;
}
.chart-scroll:has(.band-chart) { padding-left: 16px; padding-right: 16px; }
.band-chart .chart-title { font-size: max(0.8em, 26px); }
.band-chart .chart-sections {
  display: flex;
  flex-direction: column;
  /* The chart's baseline alignment would shrink each band to its text */
  align-items: stretch;
  gap: var(--band-gap);
}

/* ---------- A section: a tinted band, its letter and name beside its bars ---------- */
.band {
  display: grid;
  grid-template-columns: var(--gutter) minmax(0, 1fr);
  align-items: start;
  border-left: 6px solid var(--band);
  border-radius: 0 8px 8px 0;
  background: color-mix(in srgb, var(--band) 10%, transparent);
  padding: 4px 8px 4px 0;
}
.band-head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 4px 8px;
  color: var(--band);
  font-size: 15px;
  line-height: 1.15;
}
/* The filled letter box, in the gutter and in the song-order chips */
.band-letter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: 5px;
  background: var(--band);
  color: var(--bg);
  font-size: 16px;
  font-weight: 800;
  line-height: 1;
}
.band-head .band-letter { width: var(--letter-box); height: var(--letter-box); font-size: 17px; }
.band-head .chart-label {
  font-size: 1em;
  font-weight: 700;
  text-transform: none;
  letter-spacing: normal;
  color: var(--band);
  overflow-wrap: anywhere;
}
.band-head .chart-label-btn { min-height: 44px; text-align: left; }

/* ---------- The bars ---------- */
.band-chart .bar-grid {
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  row-gap: var(--row-gap);
}
/* N.C., a blank line or a line not in bars runs across the whole row */
.band-chart .bar-plain { grid-column: 1 / -1; min-height: 44px; }
.band-chart .bar,
.band-chart .bar-pad { min-height: 44px; }
.band-chart .bar {
  display: flex;
  /* One line: the fit puts a crowded bar on two (data-lines) */
  flex-wrap: nowrap;
  align-items: baseline;
  align-content: center;
  column-gap: 0.6em;
  padding: 0 0.35em;
  border-left: 2px solid var(--text-muted);
  /* A chord too wide for its bar is scaled down in that bar alone (set by the fit) */
  zoom: var(--fit, 1);
}
/* Chords that would go under 20 px on one line: two lines, two chords a line, in this bar only */
.band-chart .bar[data-lines='2'] {
  flex-wrap: wrap;
  row-gap: 0;
}
.band-chart .bar[data-lines='2'] .bar-chord { flex: 0 0 calc(50% - 0.3em); min-width: 0; }
.band-chart .bar-last { border-right: 2px solid var(--text-muted); }
/* The double bar where a section starts, in the band's colour */
.band-chart .bar-double {
  border-left: none;
  padding-left: calc(9px + 0.35em);
  background: linear-gradient(to right, var(--band) 0 5px, transparent 5px 7px, var(--band) 7px 9px, transparent 9px) no-repeat;
}
/* Chords share a bar from its midpoint; every chord is drawn at the chart's size */
.band-chart .bar-chord { flex: 1 1 0; min-width: max-content; }
.band-chart .bar-repeat {
  flex: 1 1 0;
  text-align: center;
  font-weight: 600;
  color: var(--text-muted);
  font-size: max(0.75em, 20px);
}
.band-chart .chart-mark { font-size: max(0.75em, 20px); }
/* N.C. sharing a bar is at the chord size */
.band-chart .bar-shared .bar-chord .chart-mark { font-size: 1em; }
/* (x2) at the end of its bar */
.band-chart .bar-count { margin-left: auto; }
/* The alteration in brackets, a little smaller: Bb7(b9) */
.band-chart .chord-alt { font-size: max(0.8em, 20px); }

/* ---------- The song order, lettered ----------
   Each chip shows its section's letter and full name (Practice) or just the
   letter (Stage), tinted like its band. The chips are not buttons. */
.form-strip.is-lettered .form-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px 2px 3px;
  border: 1.5px solid var(--band);
  background: color-mix(in srgb, var(--band) 22%, transparent);
  font-size: var(--chip-size, 17px);
  font-weight: 800;
}

/* ---------- An iPad on its side: eight bars a row on Stage ---------- */
@media (orientation: landscape) and (min-width: 900px) {
  .band-chart {
    --cols: 8;
    --chart-max: 36px;
    --band-gap: 8px;
    --row-gap: 4px;
    --letter-box: 22px;
    --chip-size: 16px;
  }
  .chart-scroll:has(.band-chart) { padding-left: 12px; padding-right: 12px; }
  .band-chart .chart-title { font-size: 24px; }
  /* Two four-bar phrases a row: the line between them is the stronger one */
  .band-chart .bar.phrase-start { border-left-color: var(--text); }
  .band-chart .bar.phrase-end { border-right: none; }
  /* Stage on its side: the letter alone beside each part */
  .stage-screen .band-chart { --gutter: 44px; }
  .stage-screen .band-head .chart-label { display: none; }
}

/* ---------- A phone: two bars a row. Last, so it wins on a small screen ---------- */
@media (max-width: 500px) {
  .band-chart {
    --cols: 2;
    --chart-max: 34px;
    --gutter: 44px;
    --band-gap: 10px;
    --row-gap: 4px;
    --letter-box: 22px;
    --chip-size: 16px;
  }
  .chart-scroll:has(.band-chart) { padding-left: 12px; padding-right: 12px; }
  .band-chart .chart-title { font-size: 22px; }
  .band-chart .pad-wide { display: none; }
  .band-head .chart-label { display: none; }
}
```

Three things changed besides the gutter: the range is now 20 to 44 (36 on its side), with no fallback size; a chord in a shared bar is no longer drawn at 0.85 em (the two-line rule replaces it); and the smallest a mark, a repeat or an alteration is drawn is 20 px, not 24.

- [ ] **Step 7: Update the two older tests.**
  - In `app/src/tests/components/band-chart.test.tsx`, in `describe('the size of a band chart', ...)`, change "grows to the largest band size" to expect `'44px'` instead of `'45px'`, and rename it "grows to the largest size, 44 px".
  - In `app/src/tests/components/chart-styles.test.ts`, replace the test "has four columns, eight in landscape and two on a phone" with:

```ts
  it('has four columns, eight in landscape and two on a phone, and chords from 20 to 44 px', () => {
    const bands = css('bands.css')
    const base = between(bands, '.band-chart {', '}')
    expect(base).toContain('--cols: 4;')
    expect(base).toContain('--chart-min: 20px;')
    expect(base).toContain('--chart-max: 44px;')
    expect(base).toContain('--gutter: 116px;')
    const landscape = between(bands, LANDSCAPE, PHONE)
    expect(landscape).toContain('--cols: 8;')
    expect(landscape).toContain('--chart-max: 36px;')
    expect(landscape).toContain('.stage-screen .band-chart { --gutter: 44px; }')
    const phone = between(bands, PHONE)
    expect(phone).toContain('--cols: 2;')
    expect(phone).toContain('.band-chart .pad-wide { display: none; }')
  })

  it('puts a crowded bar on two lines only where the fit says so', () => {
    const bands = css('bands.css')
    expect(between(bands, '.band-chart .bar {', '}')).toContain('flex-wrap: nowrap;')
    expect(between(bands, ".band-chart .bar[data-lines='2'] {", '}')).toContain('flex-wrap: wrap;')
  })

  it('keeps Practice at four bars a row on its side', () => {
    expect(between(css('practice.css'), LANDSCAPE)).toContain('.practice-screen .band-chart { --cols: 4; }')
  })
```

- [ ] **Step 8: Run the new test, the two changed ones, the types and every test**

Run: `npx vitest run src/tests/hooks/fit-chart.test.tsx src/tests/components/band-chart.test.tsx src/tests/components/chart-styles.test.ts && npx tsc -b --noEmit && npx vitest run`
Expected: `13 passed` for fit-chart, band-chart and chart-styles pass, no tsc output, then every test passes. `use-fit-text.test.tsx` is unchanged and still passes: `useFitText` itself did not change.

- [ ] **Step 9: Look at it.** Dev server at 820 × 1180 and 1180 × 820, on Stage: Somebody to Love (the tightest song) and Careless Whisper. The part's letter and name sit to the left of its bars upright, the letter alone on its side; a bar with crowded chords shows them on two lines; nothing scrolls. Screenshot both.

- [ ] **Step 10: Commit**

```bash
cd /Users/krys/Documents/coding/cheetsheetForGuitarPlaying && git status --short
git add app/src/hooks/fit-chart.ts app/src/hooks/use-chart-fit.ts app/src/components/song/BandChart.tsx app/src/styles/bands.css app/src/tests/hooks/fit-chart.test.tsx app/src/tests/components/band-chart.test.tsx app/src/tests/components/chart-styles.test.ts
git commit -m "feat: one fit rule for both screens: 20 to 44 px, two lines only where a bar needs them

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Measure all 21 songs, then release 4.0.0

**Files:**
- Create: `app/scripts/measure-stage.mjs`
- Modify: `app/src/version.ts`

**Interfaces:**
- Consumes: the built app (`npm run build` writes `../dist`, served by `vite preview` under `/gm-setlist/`); the Stage screen's classes `.stage-screen`, `.chart-scroll`, `.chart`, `.bar`, `.bar-chord`, `.stage-title`; the bar's `Switch to Stage` button and `.bb-next`.
- Produces: `node scripts/measure-stage.mjs [url]` prints one line per song and size, then a summary, and exits 1 if any song scrolls or draws a chord under 20 px.

Headless Chrome is driven over its DevTools protocol with Node's own `fetch` and `WebSocket` (Node 22 or later; this machine has 26), so nothing new is installed. A fresh browser profile opens the app on its built-in data: the GM Tribute list of 21 songs.

- [ ] **Step 1: Write `app/scripts/measure-stage.mjs`**

```js
// Measures every song of the set on Stage, upright and on its side, in headless Chrome.
// Usage, from app/: npm run build, start `npx vite preview --port 4173 --strictPort`,
// then: node scripts/measure-stage.mjs [http://localhost:4173/gm-setlist/]
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const URL = process.argv[2] ?? 'http://localhost:4173/gm-setlist/'
const PORT = 9333
const MIN_PX = 20
const SIZES = [
  { name: 'upright', width: 820, height: 1180 },
  { name: 'on its side', width: 1180, height: 820 },
]

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

/** The page Chrome opened, once its DevTools endpoint answers. */
async function pageSocket() {
  for (let i = 0; i < 50; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      const page = targets.find(t => t.type === 'page')
      if (page) return page.webSocketDebuggerUrl
    } catch {
      // not up yet
    }
    await sleep(200)
  }
  throw new Error('Chrome did not start')
}

/** A DevTools connection: send(method, params) resolves with the result. */
function connect(url) {
  const ws = new WebSocket(url)
  let id = 0
  const waiting = new Map()
  ws.onmessage = event => {
    const message = JSON.parse(event.data)
    const done = waiting.get(message.id)
    if (!done) return
    waiting.delete(message.id)
    done(message)
  }
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id
      waiting.set(n, m => (m.error ? reject(new Error(m.error.message)) : resolve(m.result)))
      ws.send(JSON.stringify({ id: n, method, params }))
    })
  return new Promise(resolve => {
    ws.onopen = () => resolve({ send, close: () => ws.close() })
  })
}

async function evaluate(cdp, expression) {
  const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (exceptionDetails) throw new Error(exceptionDetails.text)
  return result.value
}

// In the page: the song, the chart's size, whether it scrolls, and the smallest chord drawn
// (the chart's size times the zoom the fit gave the chord's bar)
const MEASURE = `(() => {
  const scroll = document.querySelector('.stage-screen .chart-scroll')
  const chart = scroll && scroll.querySelector('.chart')
  if (!chart) return null
  const size = parseFloat(chart.style.fontSize)
  const drawn = [...chart.querySelectorAll('.bar')]
    .filter(bar => bar.querySelector('.bar-chord'))
    .map(bar => size * (parseFloat(bar.style.getPropertyValue('--fit')) || 1))
  return {
    title: document.querySelector('.stage-title')?.textContent ?? '?',
    size,
    scrolls: scroll.scrollHeight > scroll.clientHeight + 1,
    smallest: drawn.length ? Math.min(...drawn) : size,
    twoLines: chart.querySelectorAll('.bar[data-lines="2"]').length,
  }
})()`

const profile = mkdtempSync(join(tmpdir(), 'measure-stage-'))
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' })
let failed = 0

try {
  const cdp = await connect(await pageSocket())
  for (const size of SIZES) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: size.width, height: size.height, deviceScaleFactor: 2, mobile: true })
    await cdp.send('Page.navigate', { url: URL })
    await sleep(2500)
    await evaluate(cdp, `document.querySelector('[aria-label="Switch to Stage"]')?.click()`)
    await sleep(500)
    // The app reopens where it was left: walk back to song 1
    await evaluate(cdp, `(async () => {
      for (let i = 0; i < 60; i++) {
        const previous = document.querySelector('.bb-prev:not(:disabled)')
        if (!previous) break
        previous.click()
        await new Promise(resolve => setTimeout(resolve, 60))
      }
    })()`)
    await sleep(400)
    const total = await evaluate(cdp, `Number((document.querySelector('.bb-count')?.textContent ?? '0/0').split('/')[1])`)
    let fit = 0
    console.log(`\n${size.name} (${size.width} × ${size.height}), ${total} songs`)
    for (let i = 0; i < total; i++) {
      const m = await evaluate(cdp, MEASURE)
      if (!m) throw new Error(`no Stage chart at song ${i + 1}`)
      const ok = !m.scrolls && m.smallest >= MIN_PX
      if (ok) fit++
      else failed++
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${String(i + 1).padStart(2)}. ${m.title.padEnd(32)} ${m.size.toFixed(1)} px, smallest ${m.smallest.toFixed(1)} px, ${m.twoLines} bars on two lines${m.scrolls ? ', SCROLLS' : ''}`)
      await evaluate(cdp, `document.querySelector('.bb-next:not(:disabled)')?.click()`)
      await sleep(400)
    }
    console.log(`${fit} of ${total} fit ${size.name}`)
  }
  cdp.close()
} finally {
  chrome.kill()
  rmSync(profile, { recursive: true, force: true })
}

process.exit(failed ? 1 : 0)
```

- [ ] **Step 2: Build and serve the app**

Run: `npm run build`
Expected: `tsc` passes and Vite writes `../dist`.

Then start the preview in the background (Bash with `run_in_background`): `npx vite preview --port 4173 --strictPort`. Wait until it prints `http://localhost:4173/gm-setlist/`.

- [ ] **Step 3: Measure**

Run: `node scripts/measure-stage.mjs`
Expected: `21 of 21 fit upright` and `21 of 21 fit on its side`, every line `ok`, exit code 0. The mockup measured the smallest song size at 28 px upright and 22 px on its side (Somebody to Love); the numbers here should be close to that.

**If any song fails, stop.** Do not change the sizes, the gutters or the two-line rule to make it pass: they are the user's rulings. Report the failing lines to the user with a Stage screenshot of that song at that size (dev server, resize_window), and wait.

- [ ] **Step 4: Stop the preview server**, then set the version. In `app/src/version.ts` change `export const APP_VERSION = '3.65.0'` to:

```ts
export const APP_VERSION = '4.0.0'
```

- [ ] **Step 5: The last full check**

Run: `npx tsc -b --noEmit && npx vitest run && npm run build && find src -name '*.ts' -o -name '*.tsx' | xargs wc -l | sort -n | tail -3`
Expected: no tsc output, every test passes, the build succeeds, and no code file is over 800 lines (`use-store.ts` at most 795).

- [ ] **Step 6: Commit**

```bash
cd /Users/krys/Documents/coding/cheetsheetForGuitarPlaying && git status --short
git add app/scripts/measure-stage.mjs app/src/version.ts
git commit -m "chore: release 4.0.0, Stage and Practice; all 21 songs measured on Stage both ways

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 7: Merge and push.** main goes straight to the iPad, so this is the release.

```bash
cd /Users/krys/Documents/coding/cheetsheetForGuitarPlaying
git fetch origin && git status --short
git checkout main && git pull --ff-only
git merge --no-ff stage-practice -m "Merge branch 'stage-practice': Stage and Practice, 4.0.0

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push origin main
```

If `git pull --ff-only` fails or the merge conflicts, stop and tell the user: another session changed main.

- [ ] **Step 8: Tell the user what to check on the iPad.** The measurement was in Chrome. Before the gig, the user opens 4.0.0 on the iPad in Safari (both the home-screen app and the browser copy) and goes through the set on Stage, upright and on its side. Safari's address bar takes about 50 px in the browser copy.
