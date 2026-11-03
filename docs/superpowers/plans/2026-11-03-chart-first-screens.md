# Chart-First Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stage and Practice show only the chart: one plain title line, the song order, the bars and the bottom bar. A chord's shapes open only when its chord is tapped, and every setting moves into More.

**Architecture:** Practice loses its panel (shape tiles, song order in words, book facts) and its setup row. One header component, `SongHeader`, serves both screens. A tapped chord opens `ChordShapesSheet`, built on the existing `Sheet`, over the chart. The song's settings (key, capo, guitar, position, Edit) and its facts (GX-10 sound, songbook, notes, cue) go into More's "This song" group. The editor's chord keyboard gets a Beat key that types `.`.

**Tech Stack:** React 19, TypeScript, Vite 8, Vitest 4 + Testing Library, zustand, Playwright (release check).

**Spec:** `docs/superpowers/specs/2026-11-02-playbook-rework-design.md`, part 5 ("The screens: chart first") and build step 3.

## Global Constraints

- Work only in the worktree `/Users/krys/Documents/coding/cheetsheetForGuitarPlaying-rework`, branch `rework`. Never touch `main`, never push.
- "Chord diagrams are not shown by default, on any screen. Tapping a chord opens its shape(s) over the chart; tapping away closes it." (spec 5)
- "Everything else (key, capo, guitar, edit, notes, GX-10 sound) moves into the existing More sheet. Stage and Practice stay separate screens … but share the one chart and the one layout rule." (spec 5)
- Anti-goal: "Chord diagrams or other panels in front of the chart by default."
- Chords never under 20 px on the iPad. The release check must stay at 0 problems: `cd app && npm run build && npm run check:release`.
- Never quote lyrics anywhere.
- Code files stay at 800 lines or fewer, one job per module: a new job goes in a new file.
- Tests check rules, not one song's chord list.
- Use jcodemunch-mcp for code lookups (load its tools with ToolSearch if deferred): search_symbols / get_symbols / get_context_bundle / find_references / get_blast_radius. Use grep/Read only for exact-text searches and for files you are about to edit. The repo id is `local/cheetsheetForGuitarPlaying-rework-36d9e891`.
- Never use bare `git stash`. The stash list is shared with other sessions.
- Run tests from `app/`: `npx vitest run <path>`; the whole suite with `npx vitest run`; types with `npx tsc -b`.

## Rulings (mine; the player skipped the questions)

- **Stage stays tap-free.** On Stage nothing on the chart reacts to a tap (an accidental touch mid-song opens nothing), so the shapes sheet is Practice only. If this is wrong, it costs one prop on Stage.
- **What stays in the title line:** title, `Key X`, `N BPM`, the time signature, plus `Capo N` when a guitar capo is on and `LOWER KEY` when the band plays lower. Both are warnings that change what the hands do. The GX-10 sound leaves the title line: the Next button already names the next song's sound, and More names this song's. If wrong, one line to restore.
- **Practice marks an edited chart** with a plain `EDITED` fact (text, not a button). Going back to the original stays in More. Stage shows no marker, as today.
- **While editing,** the header shows Done, Reset and the save status. Edit itself starts from More ("Edit the chart"), which closes the sheet. Done must never leave the screen while editing, or the player is stuck in the editor.
- **Tapping a part's name no longer does anything.** The part focus fed only the panel's tiles, so `focusSection` / `setFocusSection` go from the store and `focus` / `focusable` go from `ChartBody` / `BandChart`. A saved store never held `focusSection`: check `persistence` / `hydrate` and remove it there too if it is listed.
- **Version:** `4.10.0`.

## Review Focus

1. Changing song (swipe, Next, the pedal) while the shapes sheet is open: the sheet closes, never showing the old song's chord. Pinned in Task 1.
2. Edit mode on Practice: Done is always on screen, and switching to Stage ends editing (the store already does this, so keep it). Pinned in Task 2.
3. Keyboard instrument: chords are not buttons, no shapes sheet, and More's "This song" offers the key only, with no capo, guitar or position. Pinned in Tasks 1 and 2.
4. A capo on: Stage and Practice both still say `Capo N` in the title line. Pinned in Task 2.
5. Marks and chords without shapes (`N.C.`, `%`, `.`, `(x2)`) are not buttons on Practice. Pinned in Task 1.

---

### Task 1: Shapes on tap, the panel gone

**Files:**
- Create: `app/src/components/song/ChordShapesSheet.tsx`, `app/src/styles/shapes-sheet.css` (the tile styles the sheet uses, moved out of `practice.css` / `layout.css`; imported where the other sheet styles are imported)
- Modify: `app/src/components/practice/PracticeScreen.tsx`, `app/src/components/song/SongSheet.tsx`, `app/src/components/song/ChartBody.tsx`, `app/src/components/song/BandChart.tsx`, `app/src/store/use-store.ts`, `app/src/styles/practice.css`
- Delete: `app/src/components/practice/PracticePanel.tsx`, `PanelHandle.tsx`, `ShapeTiles.tsx`, `BookFacts.tsx`, `SongOrder.tsx`, `app/src/hooks/use-panel-size.ts`, `app/src/hooks/use-tiles-fit.ts`, and the tests that only test them (`tests/components/practice-panel.test.tsx`, `panel-handle.test.tsx`, `section-focus.test.tsx`, `song-order.test.tsx`, `tests/hooks/use-tiles-fit.test.ts`). Before deleting, move any assertion in them about a shape choice (picking a shape, "Use the recommended shape", Yours / In this song marks) into the new test file. Keep `BookFacts.tsx` (Task 2 moves its content into More and deletes it); only remove its use here.
- Test: `app/src/tests/components/chord-shapes-sheet.test.tsx`; update `screens.test.tsx`, `band-chart.test.tsx`, `saving-ui.test.tsx` where they reference the panel or part focus.

**Interfaces:**
- Produces: `ChordShapesSheet({ chart, chord, onClose }: { chart: SongChart; chord: string; onClose: () => void })`, a `Sheet` with `label={`Shapes for ${chord}`}`. Its body is today's `ShapeTiles` picked branch: every listed voicing as a tile with `ChordDiagram`, the one in this song marked "In this song", "Yours" on the player's own, a ▶ play button, a "Use the recommended shape" button when the song's shape is the player's pick, and the hint line. Tapping a tile calls `pickSongShape(song.title, chord, shape)` and then `onClose()`. The "All shapes" button goes.
- `ChartBody` keeps `onChord` / `picked` and loses `focus`. `BandChart` loses `focusable`, `focusedIndex` and `onFocus`; a part's name is always a plain `div.chart-label`.
- `SongSheet({ onPick })`: `picked` stays only to draw the open chord as picked.

- [ ] **Step 1: Write the failing tests** in `chord-shapes-sheet.test.tsx`, rendering `PracticeScreen` the way `screens.test.tsx` does:
  - `practice shows no chord diagram until a chord is tapped`: `queryAllByRole('img')` inside `main[aria-label="Practice"]` has length 0; no element with aria-label `Shapes and the book`.
  - `tapping a chord opens its shapes over the chart`: click the first `.chart-chord-tap` → `getByRole('dialog', { name: /^Shapes for / })` exists and holds at least one `img`.
  - `tapping away closes it`: click `.sheet-backdrop` → no dialog.
  - `picking a shape uses it in this song and closes`: click a tile that is not "In this song" → the dialog is gone and the store's `edits[title].shapes[chord]` is set.
  - `a new song closes the shapes`: open the sheet, call `useStore.getState().nextSong()` inside `act` → no dialog.
  - `marks are not buttons`: no `.chart-chord-tap` has text `N.C.`, `%`, `.` or `(x2)`. Load a test song whose chart holds all four, following the fixture helpers the existing tests use.
  - `the keyboard player gets no shapes`: set instrument `keyboard` → `.chart-chord-tap` count 0.
  - `a part's name is not a button`: no `button.chart-label-btn` on Practice.
- [ ] **Step 2: Run them to see them fail**: `npx vitest run src/tests/components/chord-shapes-sheet.test.tsx`. Expected: FAIL (the panel still renders images, and there is no dialog).
- [ ] **Step 3: Build `ChordShapesSheet`, wire it into `PracticeScreen`, and remove the panel, the part focus and the files listed.** `PracticeScreen` keeps today's per-song `picked` state (`{ title, chord }`), so a new song lets go. It renders `<ChordShapesSheet>` when `pickedChord` is set, and a second tap on the same chord closes it. Remove the `.practice-panel`, panel-handle and tile styles that nothing uses any more.
- [ ] **Step 4: Run the whole suite and the types**: `npx vitest run && npx tsc -b`. Expected: all pass, no type errors. Fix or remove each failing old test that tested the panel. Never weaken a test of anything that still exists.
- [ ] **Step 5: Commit**: `git commit -m "feat: Practice is the chart; a chord's shapes open when it is tapped"`

### Task 2: One title line, the settings in More

**Files:**
- Create: `app/src/components/song/SongHeader.tsx`, `app/src/components/sheets/SongSettings.tsx` (the controls, moved from `PracticeSetup` without Edit / Done / Reset), `app/src/components/sheets/SongFacts.tsx` (the GX-10 sound, songbook, shapes source, key / capo line, cue and notes, moved from `BookFacts`), `app/src/components/edit/EditBar.tsx` (Done, Reset, `SaveStatus`, moved from `PracticeSetup`)
- Modify: `app/src/components/stage/StageScreen.tsx`, `app/src/components/practice/PracticeScreen.tsx`, `app/src/components/sheets/MoreSheet.tsx`, `app/src/styles/stage.css`, `app/src/styles/practice.css`
- Delete: `app/src/components/stage/StageHeader.tsx`, `app/src/components/practice/PracticeHeader.tsx`, `PracticeSetup.tsx`, `BookFacts.tsx` (if still there). Move their tests' still-true assertions into the new tests; delete `practice-header.test.tsx` once it is empty.
- Test: `app/src/tests/components/song-header.test.tsx`, `app/src/tests/components/more-song.test.tsx`; update `stage-screen.test.tsx`, `stage-polish.test.tsx`, `screens.test.tsx`, `keyboard-view.test.tsx`, `original-chart.test.tsx`, `saving-ui.test.tsx`, `move-chords-sheet.test.tsx` where they find controls in the old headers.

**Interfaces:**
- Consumes: `SongChart` from `hooks/use-song-chart` (`song`, `playedKey`, `bpm`, `capo`, `keyboard`, `lowerKey`, `edited`, `showForm`, `form`, `letters`); `FormStrip` (`short` on both screens); `SoundFact`.
- Produces: `SongHeader({ chart, extraFrom, screen }: { chart: SongChart; extraFrom: string | null; screen: 'stage' | 'practice' })`. Row 1: `h1` title, the extra tag, then facts as `span.fact`: `Key {playedKey}`, `{bpm} BPM`, the time signature, `Capo {capo}` (`is-warn`, guitar only, capo > 0), `LOWER KEY` (`is-danger`), and on Practice `EDITED` when `chart.edited`. Row 2: `FormStrip` when `showForm`. Then the cue. On Practice in edit mode, `EditBar` follows the facts. With no `EditBar`, the header holds no button at all.
- `SongSettings({ chart }: { chart: SongChart })` and `SongFacts({ chart }: { chart: SongChart })`, rendered in More's "This song" group above "Back to the original chart". The group also gets an `Edit the chart` item that calls `toggleEditMode()` and then the sheet's `onClose()`. More stays on Practice only, as today.

- [ ] **Step 1: Write the failing tests.**
  - `song-header.test.tsx`:
    - `stage and practice share one title line`: on both screens the header shows `Key`, `BPM` and the time signature as text, and `within(header).queryAllByRole('button')` has length 0 (Practice not editing).
    - `a capo is said on both screens`: set capo 2 → `Capo 2` in both headers.
    - `the GX-10 sound is not in the title line`: no `SoundFact` text in the header for a song that has a sound.
    - `editing shows Done until it ends`: `toggleEditMode()` → the header has a `Done` button; clicking it ends edit mode; switching to Stage ends edit mode too.
    - `an edited chart says EDITED on Practice only`.
  - `more-song.test.tsx`:
    - `More holds the song's settings`: open More on Practice → buttons `Transpose down`, `Transpose up`, the capo button, the guitar button and `Edit the chart`; text for the songbook line and the GX-10 sound.
    - `Edit the chart closes More and starts editing`.
    - `the keyboard player gets the key only`: instrument keyboard → no capo, guitar or position buttons in More.
    - `transposing from More changes the title line`: click `Transpose up` → the header's `Key` text changes.
- [ ] **Step 2: Run them to see them fail**: `npx vitest run src/tests/components/song-header.test.tsx src/tests/components/more-song.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Build `SongHeader`, `SongSettings`, `SongFacts` and `EditBar`; use them in both screens and in More; delete the old headers, setup and book facts.** CapoPicker and MoveChordsSheet open over More, as RestoreModal does today. The Stage and Practice header CSS collapses into one set of rules. Keep the side-on layout, where the rows share a line when they fit.
- [ ] **Step 4: Run the whole suite and the types**: `npx vitest run && npx tsc -b`. Expected: all pass.
- [ ] **Step 5: Commit**: `git commit -m "feat: one title line on both screens; the song's settings and facts move into More"`

### Task 3: The Beat key in the editor

**Files:**
- Modify: `app/src/components/edit/ChordKeyboard.tsx`
- Test: `app/src/tests/components/chord-keyboard.test.tsx` and `chart-editor.test.tsx` (add to them)

**Interfaces:**
- Consumes: `onBar(token)` → `ChartEditor.putBar`, which already inserts any token after the cursor.
- Produces: a `ck-tool ck-bar` button with aria-label `Beat` and the text `·`, placed after `%`, that calls `onBar('.')`. It is disabled when `!ready`.

- [ ] **Step 1: Write the failing tests.**
  - In `chord-keyboard.test.tsx`, `the Beat key types a dot`: click `Beat` → `onBar` was called with `'.'`.
  - In `chart-editor.test.tsx`, `a beat dot goes after the chord selected`: select a chord in a one-bar chart, tap `Beat` → the saved line holds that chord followed by ` . ` (spacing as `fromGrid` writes it; check an existing `%` test for the exact form) and the chart still reads one bar.
- [ ] **Step 2: Run them to see them fail.**
- [ ] **Step 3: Add the key.**
- [ ] **Step 4: `npx vitest run && npx tsc -b`**. Expected: all pass.
- [ ] **Step 5: Commit**: `git commit -m "feat: a Beat key in the chord keyboard types a beat dot"`

### Task 4: The release check sees panels, and 4.10.0

**Files:**
- Modify: `app/scripts/release-check.mjs`, `app/scripts/release-problems.mjs`, `app/src/tests/scripts/release-problems.test.ts`, `app/src/version.ts`, `app/public/version.json` (if it holds the version; match how 4.9.0 was set)

**Interfaces:**
- `problems({ chords, sections, bars, diagrams = 0 })`: when `diagrams > 0`, add `['screen', `${diagrams} chord diagram(s) shown before any tap`]`. `release-check.mjs` reads `diagrams` as the number of `svg[role="img"]` inside `main` on the loaded page, before anything is tapped.

- [ ] **Step 1: Write the failing test** in `release-problems.test.ts`: `a chord diagram on a fresh page is a problem`: `problems({ chords: [], sections: [], diagrams: 2 })` holds one entry whose text contains `chord diagram`, and `diagrams: 0` adds none.
- [ ] **Step 2: Run it to see it fail.**
- [ ] **Step 3: Add the rule and the count, and set the version to `4.10.0`.**
- [ ] **Step 4: Run everything**: `npx vitest run && npx tsc -b && npm run build && npm run check:release`. Expected: tests pass, and the release check reports 0 problems over all its pages (344 or more).
- [ ] **Step 5: Commit**: `git commit -m "test: the release check fails a page that shows chord diagrams before a tap; 4.10.0"`
