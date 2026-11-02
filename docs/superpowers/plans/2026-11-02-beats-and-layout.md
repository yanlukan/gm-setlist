# Beats and one layout rule: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bars carry beats, every chord sits under its beat, the whole chart is one size on every screen, and a release check opens every song at the iPad sizes and fails on any chord that is too small, crosses its bar or overlaps another.

**Architecture:** The chart text gains a beat dot (`.`) inside bars; `music/bars.ts` turns a bar's tokens into beat columns. `BandBars.tsx` draws each bar as a CSS grid of those columns. `hooks/fit-chart.ts` is rewritten to one rule: the largest size from 44 to 20 px at which the chart fits, every bar whose chords do not fit their beats at that size staggered (chords alternate top and bottom line, each under its own beat); no bar is ever zoomed alone. A Playwright script checks the built app in WebKit (iPad Safari's engine) and Chromium.

**Tech Stack:** React 19, TypeScript, Vite 8, Vitest 4, Playwright (new dev dependency).

**Spec:** `docs/superpowers/specs/2026-11-02-playbook-rework-design.md` (build steps 1 and 2; Design parts 1, 2 and 6). Later steps (chart-first screens, evidence, the recording tool, adding a song, switching over) get their own plans after this one lands.

## Global Constraints

- Chords never under 20 px on the iPad; the largest chart size is 44 px.
- Sizes checked: 820 × 1180, 1180 × 820, 1024 × 1366, and a phone at 390 × 844.
- A bar written without dots keeps today's meaning: its chords share it equally.
- No bar is ever shrunk alone (`--fit` / `zoom` on a bar goes away).
- Any rule that exists for one song is an anti-goal.
- Code files 800 lines or fewer, one job per module.
- Never quote lyrics anywhere.
- Work on branch `rework` in `/Users/krys/Documents/coding/cheetsheetForGuitarPlaying-rework`; nothing is pushed to `main` by this plan.

## Review Focus

- A pasted ChordPro grid (`| C . . . | G . . . |`) used to lose its dots; now it keeps them, and a bar of only dots after a chord must still read as that chord held, never as an empty bar.
- A dot outside a bar line (a line not in bars) must not show as a chord or an unknown token in the editor's "not a chord" warning.
- Transposing or moving chords must leave dots where they are (`transposeInKey` and the editor's capo shapes).
- A bar of one very long chord (Jesus to a Child's C#madd9) at 20 px on a phone cannot fit even split: the release check must report it by song and bar, and the chart must not overlap the next bar.
- A repeat count `(x2)` or `%` in a bar with dots must not take a beat column.

Each is pinned by a test in Task 1, 3 or 4 below.

---

### Task 1: The beat format

**Files:**
- Modify: `app/src/music/bars.ts` (stop `fromGrid` dropping dots; add beats)
- Modify: `app/src/music/theory.ts:128` (`isChartMark` accepts `.`)
- Test: `app/src/tests/music/bars-beats.test.ts` (new)

**Interfaces:**
- Produces: `export const BEAT = '.'`; `export interface BarChord { token: string; start: number; length: number }`; `export interface BarBeats { beats: number; chords: BarChord[]; dotted: boolean }`; `export function beatsOf(bar: string[]): BarBeats` in `music/bars.ts`.

- [ ] **Step 1: Write the failing tests**

```ts
import { beatsOf, fromGrid, barsOf } from '../../music/bars'
import { isChartMark } from '../../music/theory'
import { parseChordText } from '../../music/chord-text'

describe('beatsOf', () => {
  it('places each chord on its beat when the bar has dots (Faith: B F#/A# G#m .)', () => {
    expect(beatsOf(['B', 'F#/A#', 'G#m', '.'])).toEqual({
      beats: 4, dotted: true,
      chords: [{ token: 'B', start: 0, length: 1 }, { token: 'F#/A#', start: 1, length: 1 }, { token: 'G#m', start: 2, length: 2 }],
    })
  })
  it('shares a bar without dots equally, as before', () => {
    expect(beatsOf(['E', 'B'])).toEqual({ beats: 2, dotted: false, chords: [{ token: 'E', start: 0, length: 1 }, { token: 'B', start: 1, length: 1 }] })
  })
  it('holds a chord over the dots after it', () => {
    expect(beatsOf(['C', '.', '.', '.']).chords).toEqual([{ token: 'C', start: 0, length: 4 }])
  })
  it('leaves % and (x2) out of the beats', () => {
    expect(beatsOf(['%'])).toEqual({ beats: 1, dotted: false, chords: [] })
    expect(beatsOf(['A', '.', 'D', '.', '(x2)']).beats).toBe(4)
  })
})

describe('dots in chart text', () => {
  it('are a chart mark, never a chord to transpose', () => {
    expect(isChartMark('.')).toBe(true)
  })
  it('survive a pasted ChordPro grid', () => {
    expect(fromGrid('| C . . . | G . . . |')).toBe(' | C . . . | G . . . | ')
    expect(barsOf(parseChordText('| C . . . | G . . . |')[0])).toEqual([['C', '.', '.', '.'], ['G', '.', '.', '.']])
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd app && npx vitest run src/tests/music/bars-beats.test.ts`
Expected: FAIL, `beatsOf` is not exported, and `fromGrid` drops the dots.

- [ ] **Step 3: Implement**

In `bars.ts`: `fromGrid` keeps only the bar-line rule (`text.replace(/\|+/g, ' | ')`) and its doc comment says dots are beats. `beatsOf`: drop `%` and repeat-count tokens; if any token is `BEAT`, each remaining token is one beat and a chord's `length` runs to the next chord or the bar's end; otherwise each chord is one beat. A bar that starts with dots before its first chord gives that chord its own start (the dots before it are empty beats). In `theory.ts`, `isChartMark` also returns true for `'.'`.

- [ ] **Step 4: Run all tests**

Run: `cd app && npx vitest run`
Expected: all pass. Fix any test that asserted dots are dropped by changing it to the new rule (the grid paste test in `tests/music/`).

- [ ] **Step 5: Commit**

```bash
git add app/src/music/bars.ts app/src/music/theory.ts app/src/tests
git commit -m "feat: bars keep their beat dots; beatsOf places each chord on its beat"
```

### Task 2: The release check

**Files:**
- Create: `app/scripts/release-check.mjs`
- Modify: `app/package.json` (dev dependency `playwright`, script `"check:release": "node scripts/release-check.mjs"`)
- Modify: `.gitignore` (add `app/release-shots/`)

**Interfaces:**
- Consumes: the built app (`npm run build`), served by the script itself with `vite preview --port 4179 --strictPort`, at `http://localhost:4179/gm-setlist/`.
- Produces: exit code 0 when every song passes at every size on both screens; otherwise 1 and one line per problem: `<size> <screen> <nn> <song> bar <n>: <problem>`. Pictures in `app/release-shots/<engine>/<size>/<screen>/<nn>-<song>.png`, and `app/release-shots/changed.txt` listing pictures that differ from the run before (compared by SHA-256 of the file; the previous run's hashes in `app/release-shots/hashes.json`).

- [ ] **Step 1: Install Playwright**

Run: `cd app && npm i -D playwright && npx playwright install webkit chromium`
Expected: installs; the cached browsers in `~/Library/Caches/ms-playwright` may already cover it.

- [ ] **Step 2: Write `release-check.mjs`**

For each engine (webkit, chromium), each size in Global Constraints, each screen (Stage, Practice: switch with the bottom bar's "Switch to Stage" / "Switch to Practice" buttons), each of the 21 songs (open through "Songs, n of 21" and the song's row, or next-song from song 1): wait for two animation frames after the fit, then in the page read every `.band-chart .bar-chord` and its `.bar`:
- problem `chord under 20 px` when `getComputedStyle(chord).fontSize` × the bar's effective zoom < 20;
- problem `runs past its bar` when the chord's content box (`chord.firstElementChild ?? chord` bounding rect) leaves the bar's rect by more than 1 px;
- problem `overlaps <other chord>` when two chord content rects in one bar intersect by more than 1 px;
- problem `cut off` when a chord's `scrollWidth > clientWidth + 1`.
Then take the full-page screenshot. Reuse the wait and navigation approach of `scripts/measure-stage.mjs` where it helps; keep the file under 300 lines.

- [ ] **Step 3: Run it on today's layout**

Run: `cd app && npm run build && npm run check:release`
Expected: it runs all 2 × 4 × 2 × 21 = 336 pages and prints today's problems (the zoomed bars under 20 px at least). Save its output as the "before" list in the commit message.

- [ ] **Step 4: Commit**

```bash
git add app/scripts/release-check.mjs app/package.json app/package-lock.json .gitignore
git commit -m "test: release check opens every song at the iPad sizes in WebKit and Chromium"
```

### Task 3: Bars drawn in beat columns

**Files:**
- Modify: `app/src/components/song/BandBars.tsx` (a bar is a grid of its beats)
- Modify: `app/src/styles/bands.css` (bar grid; remove `.bar-chord { flex... }`, `[data-one-a-line]`, `[data-under]`, `zoom: var(--fit, 1)`)
- Modify: `app/src/styles/practice.css:125-128` (remove the equal-slot rule; columns now do it)
- Test: `app/src/tests/components/band-bars-beats.test.tsx` (new)

**Interfaces:**
- Consumes: `beatsOf` (Task 1).
- Produces: each `.bar` has `style="--beats: <n>"` and `data-beats="<n>"`; each `.bar-chord` has `style="--start: <start+1>; --span: <length>"` and `data-start="<start>"`; dots render nothing; `%` and `(x2)` keep their spans (`.bar-repeat` spans all columns, `.bar-count` sits after them).

- [ ] **Step 1: Write the failing test**

```tsx
it('puts each chord in the column of its beat', () => {
  render(<BandBars lines={['|  B  F#/A#  G#m  .  |']} renderTokens={t => t} />)
  const bar = document.querySelector('.bar')!
  expect(bar.getAttribute('data-beats')).toBe('4')
  const chords = [...document.querySelectorAll('.bar-chord')]
  expect(chords.map(c => c.textContent)).toEqual(['B', 'F#/A#', 'G#m'])
  expect(chords.map(c => c.getAttribute('data-start'))).toEqual(['0', '1', '2'])
  expect((chords[2] as HTMLElement).style.getPropertyValue('--span')).toBe('2')
})
it('draws a bar without dots as equal columns, as before', () => {
  render(<BandBars lines={['|  E  B  |']} renderTokens={t => t} />)
  expect(document.querySelector('.bar')!.getAttribute('data-beats')).toBe('2')
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd app && npx vitest run src/tests/components/band-bars-beats.test.tsx`
Expected: FAIL, no `data-beats`.

- [ ] **Step 3: Implement**

`.band-chart .bar { display: grid; grid-template-columns: repeat(var(--beats, 1), minmax(0, 1fr)); column-gap: 0.3em; align-items: baseline; }` and `.band-chart .bar-chord { grid-column: var(--start) / span var(--span); min-width: 0; white-space: nowrap; overflow: hidden; }`. A staggered bar (Task 4) is `data-lines="2"`: two grid rows, each chord at `grid-row: var(--row)` and `grid-column: var(--start) / span var(--run)`, both written by the fit (Task 4). Keep the double bar, phrase lines and `bar-last` as they are.

- [ ] **Step 4: Run all tests and the release check**

Run: `cd app && npx vitest run && npm run build && npm run check:release`
Expected: vitest passes (update tests that read the removed `data-one-a-line`/`data-under` to the new attributes). The release check may still fail; record its problems.

- [ ] **Step 5: Commit**

```bash
git add app/src
git commit -m "feat: every bar is drawn in beat columns, each chord under its beat"
```

### Task 4: One layout rule

**Files:**
- Modify: `app/src/hooks/fit-chart.ts` (rewrite `layOutBars` and `useBandFit`; delete `needsTwoLines`, `scaleOf`'s two modes, `shrink`, `oneSize`)
- Modify: `app/src/hooks/use-chart-fit.ts:24` (no `oneSize`)
- Modify: `app/src/hooks/use-fit-text.ts` (remove `fitCells`/`--fit` for bands if only bands use it; check with `grep -rn fitCells src`)
- Test: `app/src/tests/hooks/fit-chart.test.tsx` (replace the two-line, one-size and shrink tests with these)

**Interfaces:**
- Consumes: the attributes from Task 3.
- Produces: `layOutBars(content: HTMLElement): number` — lays out every bar at the content's current font size and returns how many bars still do not fit even split. `useBandFit(containerRef, contentRef, contentKey, enabled): void` (the `oneSize` parameter goes; Stage and Practice call it the same way).

- [ ] **Step 1: Write the failing tests**

Using the file's existing `fakeBar`/`slottedBar` helpers (jsdom has no layout), adapted so a chord's `clientWidth` is its columns' width:
- `it('keeps a bar on one line when every chord fits its columns')` → `data-lines` unset, returns 0.
- `it('staggers a bar whose chords do not fit their beats, each still under its beat (Faith: B F#/A# G#m .)')` → beats 4, starts 0, 1, 2: `data-lines="2"`, rows `[1, 2, 1]`, `--start` `[1, 2, 3]`, `--run` `[2, 3, 2]` (each runs to the next chord on its own line, or the bar's end).
- `it('staggers a three-chord bar without dots the same way, so the last chord is on the right of the top line')` → beats 3: rows `[1, 2, 1]`, `--run` `[2, 2, 1]`.
- `it('never starts a line with a lone chord at the left unless it is on beat 1')` → for every staggered bar, every chord on row 2 has `--start` > 1.
- `it('never sets --fit or zoom on a bar')` → after any layout, no bar has `--fit`.
- `it('counts a bar of one chord too long even split')` → returns 1.
- `useBandFit` (existing fakeChart helpers): `it('takes the largest size from 44 down to 20 at which the chart fits and returns to it after a refit')`, and `it('stops at 20 when nothing fits, and scrolls')`.

- [ ] **Step 2: Run them to see them fail**

Run: `cd app && npx vitest run src/tests/hooks/fit-chart.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`layOutBars`: clear `data-lines`, `--row`, `--run` on every bar and chord; read every bar (a chord fits when its content's `scrollWidth <= clientWidth + 1`); for each bar with a chord that does not fit and more than one chord: chord i goes on row `i % 2 + 1`, keeps its `--start`, and gets `--run` = the beats from its start to the next chord on its own row's start, or the bar's end. Write all, then read again and return the bars with a chord still not fitting. `useBandFit`: `largestFit(size => { set size; layOutBars(content); return fits() }, min, max, guess)` with `min`/`max` from `--chart-min`/`--chart-max` (defaults 20/44), then set that size and lay out once more. Keep the ResizeObserver, `REFIT_EVENT` and the `data-resizing` hold as they are.

- [ ] **Step 4: Run all tests, build, and the release check**

Run: `cd app && npx vitest run && npm run build && npm run check:release`
Expected: vitest passes. The release check reports no `chord under 20 px` (zoom is gone). Every remaining problem is a bar of one long chord, or a staggered bar still too narrow; list them.

- [ ] **Step 5: Commit**

```bash
git add app/src
git commit -m "feat: one layout rule for every screen: one chart size, a crowded bar staggered, each chord under its beat"
```

### Task 5: Faith's beats, and the release check green

**Files:**
- Modify: `app/src/data/songs.ts` (Faith's pre-chorus bar becomes `|  B  F#/A#  G#m  .  |`, from the recording: B on 1, F#/A# on 2, G#m from 3)
- Modify: whatever data the release check's remaining problems point at: only chord spelling that a published source or the songbook supports (for example a long chord written with its alteration in brackets, which the chart already draws smaller), never a layout rule for one song
- Modify: `app/src/version.ts` (`5.0.0-beta.1`)

- [ ] **Step 1:** Change Faith's bar; run `npx vitest run` (update the tests that read Faith's pre-chorus text).
- [ ] **Step 2:** `npm run build && npm run check:release`; for each remaining problem, write down song, bar and size. If the only fix is a layout rule for that song, stop and report it instead of changing data.
- [ ] **Step 3:** Look at the pictures for Faith, Somebody to Love, Club Tropicana and Jesus to a Child at 820 × 1180 in both engines (`app/release-shots/webkit/820x1180/...`) and confirm each chord sits under its beat and the chart is one size.
- [ ] **Step 4: Commit**

```bash
git add app/src
git commit -m "feat: Faith's walk-down on its beats; release check passes on every song (5.0.0-beta.1)"
```
