# Chord Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every chord in a shipped chart says where it came from, and a bar whose sources disagree carries a small mark that, tapped on Practice, shows what each source says and settles it in one tap.

**Architecture:** Evidence lives on the `Song` (shipped data), keyed by section name, apart from the chart text, so the player's saved copies and the editor never carry or lose it. A bar's evidence names the chords it is about; a mark shows only while the bar still reads those chords and the player has not settled it. Settling writes the chosen chords into the chart (an ordinary saved edit) and records what the player heard in `SongEdits.heard`.

**Tech Stack:** React 19, TypeScript, Vite 8, Vitest 4, zustand, IndexedDB, Playwright (release check).

**Spec:** `docs/superpowers/specs/2026-11-02-playbook-rework-design.md` (part 3, "Chords with evidence"; build step 4). Earlier plans on this branch: `2026-11-02-beats-and-layout.md`, `2026-11-03-chart-first-screens.md`.

## Global Constraints

- Work on branch `rework` in `/Users/krys/Documents/coding/cheetsheetForGuitarPlaying-rework`. Never push, never merge, never touch `main`.
- Code files stay at 800 lines or fewer, one job per module. `app/src/store/use-store.ts` is at 740 lines: add nothing to it; new store actions go in a new module, the way `store/song-shapes.ts` does it.
- Chords never under 20 px on the iPad. Stage device 820 × 1180, upright and on its side; also 1024 × 1366 and a phone.
- Stage stays tap-free: nothing on the Stage chart reacts to a tap.
- Chord diagrams or other panels never show in front of the chart by default.
- No rule that exists for one song. Tests check rules, not one song's chord list (the data test in Task 2 checks every song alike).
- Never quote lyrics anywhere (sections are named by part, never by words).
- Sources are exactly `Ear`, `Book`, `Record`, `Chart`, `Unsure`. Ear wins over everything.
- Release check before every commit that touches layout: `cd app && npm run build && npm run check:release`.
- Copy follows the app's voice: plain words, sentence case, no jargon.

## Rulings (mine; the player skipped the questions)

- Evidence is stored on the `Song`, by section name, not inside `Section`. Cost if wrong: one data move.
- A bar is numbered within its section from 0, counting every bar of every line written in bars (lines not in bars count none), in reading order, `%` bars included. Its chords are its tokens without repeat counts, joined by one space (`B F#/A# G#m .`).
- Unsure is a bar's source only, never a whole section's: a doubtful section lists its bars. Cost if wrong: longer data.
- A song with no evidence shows no marks: unknown is not the same as disputed. The 21 shipped songs all carry evidence (Task 2's test). Imported songs get theirs from the tool in build step 6.
- A mark shows while the bar still reads the chords the evidence is about and the player has not settled it to those chords. The player changing the bar in the editor removes the mark (they wrote it: that is Ear).
- The mark shows on both screens, as a small `?` on the bar; only Practice makes it a button. Stage shows it so a doubtful bar never reads as fact on stage.
- Settling: the player's choice goes into the chart through the existing `saveSections` (so it gets "Before your changes" history and drops back to the built-in chart when it equals it), and into `SongEdits.heard`.
- Where the chords came from shows only in More's song facts ("Chords"), never on the chart.
- Version 4.11.0.
- The plan goes into execution without the player reviewing it (they said "skip questions", "Go ahead", "Builder per task").

## Review Focus

1. A saved copy (the iPad has edited copies) whose bar differs from the evidence: no mark, no crash. Test: Task 1 `openUnsure` "no mark once the bar reads other chords".
2. A song played with a transpose or a capo: the readings show at the pitch the chart shows, and settling stores the song's own pitch. Test: Task 3 "readings show at the chart's pitch, and the choice is stored at the song's".
3. The player settles to another reading, then goes back to the built-in chart: the disputed bar is back, so its mark is back. Test: Task 1 "a mark comes back when the settled chords are gone".
4. A bar carrying a repeat count (`| E | % (x2) |`) is settled: the count stays with it. Test: Task 1 `replaceBar` "keeps a repeat count".
5. The mark on a crowded, staggered or long-chord bar at a phone width: it never covers a chord. Test: Task 4's release-check song and the `problems()` mark rule.

---

### Task 1: The evidence model and settling a bar

**Files:**
- Modify: `app/src/types.ts` (types below; `Song.chordsFrom`, `Song.evidence`, `SongEdits.heard`)
- Create: `app/src/music/evidence.ts`
- Create: `app/src/store/evidence.ts`
- Test: `app/src/tests/music/evidence.test.ts`, `app/src/tests/store/evidence.test.ts`

**Interfaces:**
- Produces, in `types.ts`:

```ts
export type Source = 'Ear' | 'Book' | 'Record' | 'Chart' | 'Unsure'
/** What one source says a bar is. */
export interface Reading { from: Exclude<Source, 'Unsure'>; chords: string }
/** Where one bar's chords came from, where it differs from its section. */
export interface BarEvidence {
  /** The bar in its section, from 0 (see barChords). */
  bar: number
  /** The bar's chords as the chart writes them, one space apart: the evidence is about these. */
  chords: string
  from: Source
  /** For an Unsure bar: what each source says, two or more. */
  readings?: Reading[]
}
export interface SectionEvidence { from?: Exclude<Source, 'Unsure'>; bars?: BarEvidence[] }
// Song:
chordsFrom?: Exclude<Source, 'Unsure'>            // the song's chords, unless a section says otherwise
evidence?: Record<string, SectionEvidence>        // by section name
// SongEdits:
heard?: Record<string, Record<number, string>>    // by section name, then bar: the chords the player settled on
```

- Produces, in `music/evidence.ts`:
  - `barsOfSection(chords: string): string[][]` — the section's bars in the order above (uses `barsOf`, `hasBars`).
  - `barChords(bar: string[]): string` — tokens without repeat counts, one space apart.
  - `replaceBar(chords: string, bar: number, next: string): string` — the section text with that bar's chords replaced by `next`'s tokens; its repeat count stays after it; the line holding it is rewritten with two spaces between tokens (`|  B  |  E  |`), every other line unchanged; a bar number past the end returns the text unchanged.
  - `interface UnsureBar { section: number; name: string; bar: number; evidence: BarEvidence }` (`section` is the index in the stored sections).
  - `openUnsure(song: Song, edits: SongEdits | undefined): UnsureBar[]` — over `edits?.sections ?? song.sections`.
  - `SOURCE_LABEL: Record<Source, string>` = `{ Ear: 'By ear', Book: 'Songbook', Record: 'The recording', Chart: 'A published chart', Unsure: 'Unsure' }`.
  - `chordsFromText(song: Song, edits: SongEdits | undefined): string | null` — one line for More, or null when the song has no `chordsFrom`.
- Produces, in `store/evidence.ts`: `settleBar(title: string, section: string, bar: number, chords: string): void`.

- [ ] **Step 1: Write the failing tests** (`tests/music/evidence.test.ts`)

```ts
const text = '|  E  |  B  |  E  |  B  |\n|  E  |  B  F#/A#  G#m  .  |  C#m  |  F#  N.C.  |'
it('numbers bars across lines, from 0', () => {
  expect(barsOfSection(text).map(barChords)).toEqual(['E', 'B', 'E', 'B', 'E', 'B F#/A# G#m .', 'C#m', 'F# N.C.'])
})
it('skips lines not in bars', () => {
  expect(barsOfSection('N.C.\n|  A  |  %  (x2)  |').map(barChords)).toEqual(['A', '%'])
})
it('replaces one bar, leaving the other lines as written', () => {
  expect(replaceBar(text, 5, 'B G#m')).toBe('|  E  |  B  |  E  |  B  |\n|  E  |  B  G#m  |  C#m  |  F#  N.C.  |')
})
it('keeps a repeat count', () => {
  expect(replaceBar('|  E  |  %  (x2)  |', 1, 'A')).toBe('|  E  |  A  (x2)  |')
})
it('leaves the text alone past its last bar', () => {
  expect(replaceBar(text, 8, 'A')).toBe(text)
})
// openUnsure, with a song whose Pre-Chorus is `text` and evidence
// { 'Pre-Chorus': { bars: [{ bar: 5, chords: 'B F#/A# G#m .', from: 'Unsure',
//   readings: [{ from: 'Book', chords: 'B G#m' }, { from: 'Record', chords: 'B F#/A# G#m .' }] }] } }
it('marks an Unsure bar that still reads its chords', () => {
  expect(openUnsure(song, undefined)).toEqual([{ section: 0, name: 'Pre-Chorus', bar: 5, evidence: song.evidence!['Pre-Chorus'].bars![0] }])
})
it('no mark once the bar reads other chords', () => {
  expect(openUnsure(song, { sections: [{ name: 'Pre-Chorus', chords: replaceBar(text, 5, 'B G#m') }] })).toEqual([])
})
it('no mark once the player settled on these chords', () => {
  expect(openUnsure(song, { heard: { 'Pre-Chorus': { 5: 'B F#/A# G#m .' } } })).toEqual([])
})
it('a mark comes back when the settled chords are gone', () => {
  // settled on 'B G#m', then back to the built-in chart: the bar reads the disputed chords again
  expect(openUnsure(song, { heard: { 'Pre-Chorus': { 5: 'B G#m' } } })).toHaveLength(1)
})
it('no marks for a song without evidence, nor for Ear, Book, Record or Chart bars', () => { /* both cases → [] */ })
it('matches bars however the chart is spaced', () => { /* edits.sections with tabs and extra spaces in bar 5 → still marked */ })
it('says where the chords came from', () => {
  // chordsFrom 'Book', Intro { from: 'Record' }, one Ear bar, one open Unsure bar:
  expect(chordsFromText(s, undefined)).toBe('Songbook. Intro: the recording. 1 bar by ear. 1 bar unsure.')
  expect(chordsFromText({ ...s, chordsFrom: undefined }, undefined)).toBeNull()
})
```

`chordsFromText` format, exactly: `<label of chordsFrom>.`, then for each section (chart order) whose `from` differs from `chordsFrom`: ` <name>: <label, lower-cased first letter>.`, then ` N bar(s) by ear.` counting Ear bars plus bars in `heard`, then ` N bar(s) unsure.` counting `openUnsure`; each count part left out when 0. `1 bar`, `2 bars`.

- [ ] **Step 2: Run to see them fail.** `cd app && npx vitest run src/tests/music/evidence.test.ts` — FAIL, module not found.
- [ ] **Step 3: Add the types and implement `music/evidence.ts`.** Chords are compared after `barChords` on both sides, so spacing never matters.
- [ ] **Step 4: Run them.** Same command — PASS.
- [ ] **Step 5: Write the failing store tests** (`tests/store/evidence.test.ts`, set up like the existing store tests for `song-shapes`):

```ts
it('settling on the chart's own chords keeps the chart and records the bar as heard', () => {
  settleBar('T', 'Pre-Chorus', 5, 'B F#/A# G#m .')
  expect(useStore.getState().edits.T?.sections).toBeUndefined()
  expect(useStore.getState().edits.T?.heard).toEqual({ 'Pre-Chorus': { 5: 'B F#/A# G#m .' } })
})
it('settling on another reading writes it into the chart', () => {
  settleBar('T', 'Pre-Chorus', 5, 'B G#m')
  expect(useStore.getState().getEditedSections('T')[0].chords).toBe(replaceBar(text, 5, 'B G#m'))
  expect(openUnsure(song, useStore.getState().edits.T)).toEqual([])
})
it('the chart before a settle is kept as an earlier version', () => { /* a SongVersion 'Before your changes' exists */ })
it('settles every section of that name', () => { /* two sections named Verse, both rewritten */ })
```

- [ ] **Step 6: Run to see them fail, implement `store/evidence.ts`, run to pass.** `settleBar` calls `useStore.getState().saveSections` with the replaced sections only when a bar changed, then adds the bar to `heard` the way `song-shapes.ts`'s `change()` saves edits (read the state fresh after `saveSections`).
- [ ] **Step 7: Full suite and types.** `cd app && npx vitest run && npx tsc -b` — all pass.
- [ ] **Step 8: Commit.** `git add -A app/src && git commit -m "feat: where a bar's chords came from, and settling an unsure bar"`

---

### Task 2: Evidence for the 21 songs

**Files:**
- Modify: `app/src/data/songs.ts` (each song: `chordsFrom`, and `evidence` where a section or bar differs)
- Test: `app/src/tests/data/evidence.test.ts`

**Interfaces:**
- Consumes: Task 1's types, `barsOfSection`, `barChords`.

The evidence comes from what each song's `notes` and the comments above its `sections` already say, nothing else. Rules:
- `chordsFrom`: `'Book'` for a song whose notes say it is from the songbook; otherwise the source its notes name (`'Chart'` for a published chart, `'Record'` for the recording).
- A section its notes or comments say comes from somewhere else (an intro "from the recording", a section the book lacks) gets that section's `from`.
- A bar the notes say the player heard or settled is `Ear`. Faith's Pre-Chorus bar 5 (`B F#/A# G#m .`, which the player heard on 2026-11-02) is `Ear`.
- A bar is `Unsure`, with its `readings`, only where the notes record that sources disagree and no decision by the player. When none qualify, ship none: Unsure bars come from the recording tool in build step 5.
- Never change a chord, a note or a section while doing this.

- [ ] **Step 1: Write the failing test** (`tests/data/evidence.test.ts`), over every song in `DEFAULT_SONGS`:

```ts
it.each(DEFAULT_SONGS.map(s => [s.title, s]))('%s says where its chords came from', (_, song) => {
  expect(['Ear', 'Book', 'Record', 'Chart']).toContain(song.chordsFrom)
  for (const [name, ev] of Object.entries(song.evidence ?? {})) {
    const section = song.sections.find(s => s.name === name)
    expect(section, `section ${name}`).toBeDefined()
    const bars = barsOfSection(section!.chords)
    for (const b of ev.bars ?? []) {
      expect(barChords(bars[b.bar] ?? []), `${name} bar ${b.bar}`).toBe(b.chords)
      if (b.from === 'Unsure') {
        expect(b.readings!.length).toBeGreaterThanOrEqual(2)
        expect(new Set(b.readings!.map(r => r.chords)).size).toBe(b.readings!.length)
      } else expect(b.readings).toBeUndefined()
    }
  }
})
```

- [ ] **Step 2: Run to see it fail.** `cd app && npx vitest run src/tests/data/evidence.test.ts` — FAIL on `chordsFrom`.
- [ ] **Step 3: Add the evidence, song by song.** In the report, one line per song: its `chordsFrom`, every section or bar given another source, and the sentence of its notes or comment that says so.
- [ ] **Step 4: Run it, then the full suite.** `npx vitest run` — all pass; `git diff --stat` shows only `songs.ts` and the new test.
- [ ] **Step 5: Commit.** `git commit -m "data: where each song's chords came from"`

---

### Task 3: The unsure mark, its sheet, and the chords' source in More

**Files:**
- Modify: `app/src/hooks/use-song-chart.ts` (`SongChart.unsure: UnsureBar[]`, from `openUnsure(song, songEdits)`; add it to `fitKey`)
- Modify: `app/src/components/song/BandBars.tsx` (`markFor?: (bar: number) => ReactNode`, drawn inside the bar's cell, bars numbered as in Task 1)
- Modify: `app/src/components/song/BandChart.tsx` (`markFor?: (section: number, bar: number) => ReactNode`, passed down by section index)
- Modify: `app/src/components/song/ChartBody.tsx` (`onUnsure?: (bar: UnsureBar) => void`; builds `markFor` from `chart.unsure`)
- Create: `app/src/components/song/UnsureSheet.tsx`
- Modify: `app/src/components/practice/PracticeScreen.tsx`, `app/src/components/song/SongSheet.tsx` (pass `onUnsure` through, Practice only, not while editing)
- Modify: `app/src/components/sheets/SongFacts.tsx` (a "Chords" row: `chordsFromText`, left out when null)
- Create: `app/src/styles/unsure.css` (imported where the other chart styles are)
- Test: `app/src/tests/components/unsure.test.tsx`

**Interfaces:**
- Consumes: Task 1's `UnsureBar`, `openUnsure`, `settleBar`, `SOURCE_LABEL`, `chordsFromText`.
- Produces: `UnsureSheet({ chart, unsure, onClose }: { chart: SongChart; unsure: UnsureBar; onClose: () => void })`.

The mark: class `bar-unsure`, text `?`. On Practice a `button` named `Unsure bar: what the sources say`; on Stage (no `onUnsure`) a `span` with `role="img"` and the name `Unsure bar`. Small, in the warning colour the title line's `Capo` warning uses, placed so it never covers a chord (Task 4's check proves it). The sheet is a `Sheet` named `Bar <bar + 1> of <section name>`; one button per reading, `<SOURCE_LABEL[from]>: <chords as shown>`, and when no reading equals the chart's chords, a first button `As charted: <chords as shown>`; then `Close`. A reading's chords are shown the way the chart shows them: `transposeInKey` by `chart.shift` from the chart's key, then `simplifyText` with the song's rule if the player asked for plain chords. Tapping a reading calls `settleBar` with the reading's chords at the song's own pitch, then closes. The tapped chord's shapes sheet and this sheet never show together; another sheet opening closes it (as `picked` does in `PracticeScreen`).

- [ ] **Step 1: Write the failing tests** (`tests/components/unsure.test.tsx`), with a song fixture like Task 1's:

```ts
it('Practice: an unsure bar has a mark you can tap', () => { /* getByRole('button', { name: 'Unsure bar: what the sources say' }) */ })
it('Stage: the mark shows but is not a button', () => { /* getByRole('img', { name: 'Unsure bar' }); no button of that name */ })
it('the sheet shows what each source says', () => {
  // dialog 'Bar 6 of Pre-Chorus', buttons 'Songbook: B G#m', 'The recording: B F#/A# G#m'
})
it('tapping a reading settles the bar and the mark goes', () => { /* click 'Songbook: B G#m' → dialog gone, no mark, chart bar reads B G#m */ })
it('readings show at the chart's pitch, and the choice is stored at the song's', () => {
  // song key B, transpose -2: button 'Songbook: A F#m'; after the click, stored bar reads 'B G#m'
})
it('offers the chart's own chords when no source has them', () => { /* first button 'As charted: …' */ })
it('no mark while editing', () => { /* editMode on → no button of that name */ })
it('More shows where the chords came from', () => { /* SongFacts row 'Chords' with chordsFromText */ })
```

- [ ] **Step 2: Run to see them fail.** `cd app && npx vitest run src/tests/components/unsure.test.tsx` — FAIL.
- [ ] **Step 3: Build it** as described above.
- [ ] **Step 4: Run them, the full suite, types and the release check.** `npx vitest run && npx tsc -b && npm run build && npm run check:release` — all pass, 0 problems.
- [ ] **Step 5: Commit.** `git commit -m "feat: unsure bars carry a mark; tap it on Practice to settle the bar"`

---

### Task 4: The release check covers the mark; 4.11.0

**Files:**
- Modify: `app/scripts/release-problems.mjs` (`problems({ chords, sections, bars, diagrams, marks = [] })`)
- Modify: `app/scripts/release-check.mjs` (`READ_CHORDS` reads `marks`; the saved pass also opens the check's own song)
- Modify: `app/scripts/release-saved.mjs` (`CHECK_SONG`, and putting it in `customSongs`)
- Modify: `app/src/version.ts` (`APP_VERSION = '4.11.0'`)
- Test: the existing test of `release-problems.mjs` (find it with `grep -rl release-problems app/src/tests`)

**Interfaces:**
- Produces: `marks` entries `{ rect: {left,right,top,bottom}, offScreen: boolean }`; problems `['mark <n>', 'unsure mark covers <chord>']` and `['mark <n>', 'unsure mark off the screen', 'width']`, n from 1.

- [ ] **Step 1: Write the failing tests** for `problems()`: a mark overlapping a chord's `text` rect by more than 1 px gives `['mark 1', 'unsure mark covers B']`; a mark beside it gives nothing; `offScreen: true` gives the off-screen problem.
- [ ] **Step 2: Run to see them fail, implement, run to pass.**
- [ ] **Step 3: The check's own song.** `CHECK_SONG` in `release-saved.mjs`: title `Release check: unsure bars`, written to IndexedDB `customSongs` under key `all` (the way `store/persistence.ts` stores them), with an Unsure bar on each of: a one-chord bar `Bbmaj9(#11)/D`, a bar of six chords, a staggered bar `B  F#/A#  G#m  .`, a `%` bar, a bar of only dots, and the last bar of a line. The saved pass opens it on both screens at every size, so the song count there is 22; the plain pass stays at 21.
- [ ] **Step 4: Prove the rule fires.** Temporarily place `.bar-unsure` over the bar's first chord, run `npm run build && npm run check:release`, see `unsure mark covers` problems, revert, run again: 0 problems. Write both outputs' summary lines in the report.
- [ ] **Step 5: Version.** `APP_VERSION = '4.11.0'`; `npx vitest run && npx tsc -b && npm run build && npm run check:release` — all pass.
- [ ] **Step 6: Commit.** `git commit -m "test: the release check proves unsure marks never cover a chord; 4.11.0"`
