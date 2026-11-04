# Adding Any Song Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One command on the Mac turns the player's recording, plus a trusted chord chart if there is one, into a song file in the beat format with every bar marked by its evidence, which the app opens like any of the 21, with no code per song.

**Architecture:**
- `app/scripts/add-song.mjs` is the one way in. It reads the trusted chart's text with a new app module (`chart-text.ts`), hands the chart and the recording to a Python command (`server/add_song.py`), and builds the finished song from the answer with a second app module (`added-song.ts`). It writes `app/src/data/added/<slug>.json`.
- The Python side reuses stage 5's reading of the record (`audio.analyze`, `bar_beats`, `read_bar`, `check_song`) and adds three pure modules beside it: the key from the record, a chart read off the record alone, and a chord-over-words chart lined up with that reading.
- `library.ts` loads every file in `app/src/data/added/` next to `SONGS`, before the recording check's marks are merged, so an added song is a song like the others. The export script and the release check count them too.

**Tech Stack:** Node 26 (runs `.ts` directly), TypeScript/Vitest, Vite `import.meta.glob`; Python 3 with the main checkout's venv (librosa, essentia, torch, BTC), standard `unittest`.

**Spec:** `docs/superpowers/specs/2026-11-02-playbook-rework-design.md`, part 4 ("Adding any song") and build step 6. Earlier plans: `2026-11-03-chord-evidence.md` (the evidence model), `2026-11-03-recording-check.md` (the tool this builds on).

## Global Constraints

- Branch `rework` in `$REPO` (the rework worktree). Never push, merge or touch `main`.
- Code files 800 lines or fewer, one job per module. Add nothing to `app/src/store/use-store.ts`. Add nothing to `app/src/data/songs.ts`.
- Python: `$PY` (the main checkout's `server/.venv/bin/python`). BTC: the main checkout's `server/btc` (found by `audio._btc_server`). Install nothing.
- The repository is public. Never commit audio, local paths or a recording's folder. A song file names its recording by file name only. Validation output goes to the scratchpad, not to `app/src/data/added/`.
- Detector chords never ship as fact: a bar that comes only from the record is `Unsure`, unless a trusted chart agrees with it.
- No rule for one song: every threshold is the same for every song, and the stage 5 thresholds are not changed.
- No lyrics anywhere. A chord-over-words chart's word lines are dropped on reading and never written, logged or tested with real words (tests use made-up words such as "la la la").
- No song may need code: adding a song adds one JSON file and nothing else.
- Before every commit that touches layout or song data: `cd app && npx vitest run && npx tsc -b && npm run build && npm run check:release` (today 360 pages, 0 problems). Python tests: from `server/`, `$PY -m unittest discover -s recording_check/tests -t .` and `$PY -m unittest discover -s tests -t .` where present.
- Version 4.13.0 (`app/src/version.ts`).

## Rulings (mine; the player skipped the questions)

- **Three kinds of trusted chart, one command.** A chart whose every section has bar lines (the app's own format) is lined up with stage 5's check: its bars are `Chart`, the bars the record disputes are `Unsure` with both readings. A chart without bar lines (chords over words, as published) is lined up chord by chord with the record's own bars: agreeing bars take the chart's spelling and are `Chart`, the rest `Unsure`. No chart: every bar is `Unsure` with the record's reading alone. Cost if wrong: a chart mixing barred and unbarred sections is read as unbarred (bar lines ignored).
- **A barred chart that will not line up keeps the chart.** The chart ships as `Chart` with no marks and the notes say the record could not be lined up. It is a trusted source, not the detector. Cost: wrong bars in a mistyped chart go unmarked; the notes say so.
- **Key** comes from the chart's `Key:` line, else from the record's chroma (Krumhansl–Schmuckler profiles). **Tempo** from the chart's `BPM:` line, else the beat tracker folded into 70–140 bpm. **Time** from `Time:`, else 4/4. Cost: a half- or double-time tempo the player fixes in More.
- **Bars off the record** start where the most BTC chord changes land on the first beat (the bar phase), on the tracker's steady beats. Lines of 4 bars; a line equal to an earlier one is the same part. Parts are named `Part 1`, `Part 2`… in order of first playing, the song order is the playing order. Cost: noisy parts; the player renames them in the editor.
- **An Unsure bar may hold one reading** (the record's) when no chart exists; the sheet shows that one reading and one tap settles it.
- **Song file:** `app/src/data/added/<slug>.json`, one `Song` per file, `chordsFrom` `Chart` (with a chart) or `Record` (without one, every bar overriding to `Unsure`). A title already in `SONGS` is refused by the tool and skipped by the app.
- **Validation song:** Freedom! '90 (lined up, 0 findings in stage 5, a Book chart), run three ways: record only, its hand chart with bar lines, its hand chart with the bar lines taken out.
- **The old Import screen** (server analysis, detector chords as fact) is left as it is; switching it off belongs to step 7.

## Review Focus

1. A chord-over-words chart must never carry a word into the song file. Test: Task 1, "word lines are dropped, chord lines kept".
2. A malformed or hand-edited file in `added/` must not stop the app or the other songs. Test: Task 2, "a malformed added file is skipped".
3. A recording much longer than the chart (a fade, a long intro) must not shift the record-only bars; the bar phase must follow the chord changes. Test: Task 3, "bar phase follows the chord changes".
4. A record reading with low confidence everywhere must still give bars, all `Unsure`, never `Chart`. Test: Task 4, "an unsure record never confirms the chart".
5. Running the tool twice on one song, or with a title already shipped, must not write a second song. Test: Task 6, "refuses a title already in the library" and "overwrites its own file".

---

### Task 1: Reading a trusted chart's text

**Files:**
- Create: `app/src/music/chart-text-import.ts`
- Test: `app/src/tests/music/chart-text-import.test.ts`

**Interfaces:**
- Consumes: `isChordToken` (`app/src/music/chord-text.ts`), `hasBars` (`app/src/music/bars.ts`).
- Produces:
```ts
export interface ChartDraft {
  title?: string; artist?: string; key?: string; bpm?: number; timeSignature?: string
  form?: string[]            // from an `Order:` line, names as written
  sections: Section[]        // barred: chords text as written, one line per bar line
  barred: boolean            // every section has bar lines
  chordLines: { section: string; chords: string[] }[]   // unbarred: each chord line's chords, in playing order
}
export function readChartText(text: string): ChartDraft
```

Format: optional header lines `Title:`, `Artist:`, `Key:`, `BPM:`, `Time:`, `Order:` (comma separated), case-insensitive. A section starts at `[Name]` or a line that is only `Name:`. A line with `|` is a bar line. A line whose every token is a chord (`isChordToken`, plus `N.C.`, `%`, `.`, `(x2)`) is a chord line. Every other line is dropped. A section header repeated with no lines plays that section again. Without `Order:`, the form is the sections in playing order (repeats included).

- [ ] **Step 1: Write the failing tests**: `reads the header lines` (Key `F#m`, BPM 92, Time `6/8`, Order `Intro, Verse, Chorus`); `a barred chart keeps its bar lines` (`barred: true`, chords equal the trimmed bar lines); `word lines are dropped, chord lines kept` (input `[Verse]\nC  G\nla la la love\nAm  F\nla la` → `chordLines` `[{section:'Verse', chords:['C','G']},{section:'Verse',chords:['Am','F']}]`, and `JSON.stringify(draft)` does not contain `la`); `a repeated header plays the section again` (form `['Verse','Chorus','Verse']`, two sections); `a chart mixing barred and unbarred sections is unbarred`; `no sections at all gives an empty draft` (`sections: []`, `barred: false`).
- [ ] **Step 2: Run** `cd app && npx vitest run src/tests/music/chart-text-import.test.ts`; expected FAIL (module missing).
- [ ] **Step 3: Implement `readChartText`.** An unbarred chart's `sections` are its section names with the chord lines joined as plain chord text (no bars), so the draft is still readable.
- [ ] **Step 4: Run the test**; expected PASS. Then `npx tsc -b`.
- [ ] **Step 5: Commit** `feat: read a trusted chord chart's text, words dropped`.

### Task 2: Songs added as data open like the others

**Files:**
- Create: `app/src/data/added-songs.ts`, `app/src/data/added/README.md` (what the folder is, that it holds one song JSON per file written by `scripts/add-song.mjs`, and that hand edits are allowed), `app/scripts/added-songs.mjs`
- Modify: `app/src/data/library.ts`, `app/scripts/export-charts.mjs`, `app/scripts/release-check.mjs` (`EXPECTED_SONGS`)
- Test: `app/src/tests/data/added-songs.test.ts`

**Interfaces:**
- Produces:
```ts
// added-songs.ts
export function isAddedSong(value: unknown): value is Song   // title, artist, key strings; bpm number; timeSignature string; sections: {name, chords} strings, at least one
export function addedSongs(files: Record<string, unknown>, shipped: Song[]): Song[]  // valid ones, sorted by file name, titles already shipped or repeated skipped
export const ADDED_SONGS: Song[]   // from import.meta.glob('./added/*.json', { eager: true, import: 'default' })
// library.ts
export const DEFAULT_SONGS = withRecordCheck([...SONGS, ...ADDED_SONGS], RECORD_CHECK)
```
```js
// app/scripts/added-songs.mjs — for Node scripts, which have no import.meta.glob
export function readAddedSongs(dir = <app>/src/data/added): object[]   // parsed *.json, sorted by name, skipping files that fail JSON.parse (with a warning on stderr)
```
`added-songs.ts` must not import `import.meta.glob` in a way Node scripts load; Node scripts import `songs.ts` and `added-songs.mjs`, never `library.ts`.

- [ ] **Step 1: Write the failing tests**: `an added song joins the library` (`addedSongs({'./added/x.json': song}, SONGS)` returns it and `DEFAULT_SONGS` contains every `ADDED_SONGS` title); `a malformed added file is skipped` (missing sections, sections not an array, a section without chords, `null`); `a title already shipped is skipped`; `two files with one title keep the first by file name`; `its own evidence survives the recording check merge` (an added song with an `Unsure` bar passes `withRecordCheck` unchanged when the check has no entry for it).
- [ ] **Step 2: Run** them; expected FAIL.
- [ ] **Step 3: Implement** `added-songs.ts`, `library.ts`, `added-songs.mjs`; `export-charts.mjs` exports `[...SONGS, ...readAddedSongs()]`; `release-check.mjs` sets `EXPECTED_SONGS = 21 + readAddedSongs().length` (keep the name; the 21 stays a named constant `SHIPPED_SONGS`).
- [ ] **Step 4: Run** `npx vitest run && npx tsc -b && npm run build && npm run check:release`; expected all pass, 360 pages, 0 problems (the folder holds no song yet).
- [ ] **Step 5: Commit** `feat: songs in src/data/added open like the shipped ones`.

### Task 3: The key and the bars off the record alone (pure Python)

**Files:**
- Create: `server/recording_check/key.py`, `server/recording_check/skeleton.py`
- Test: `server/recording_check/tests/test_key.py`, `server/recording_check/tests/test_skeleton.py`

**Interfaces:**
- Consumes: the analysis dict of `audio.analyze` (`beats`, `bpm`, `chroma`, `hop`, `chords` = BTC timeline `[{start,end,chord,...}]`, `duration`); `align.steady_beats`; `reading.bar_beats`; `verdict.read_bar`; `chords.parse/same/spell`.
- Produces:
```python
# key.py
def key_of(chroma_total) -> str          # 12 summed chroma values -> 'C', 'F#m', 'Bb' …: Krumhansl-Kessler profiles, sharp names for C G D A E B F# and their minors, flat for F Bb Eb Ab Db and theirs
def key_from_analysis(analysis) -> str   # key_of over every frame's chroma
def fold_bpm(bpm: float) -> int          # doubled or halved into [70, 140), rounded
# skeleton.py
LINE_BARS = 4
def bar_starts(beats: list, chord_times: list, beats_per_bar: int) -> list   # downbeat times: the phase where most chord changes fall within a quarter beat of a downbeat; ties take the earliest phase
def record_bars(analysis, key, beats_per_bar=4) -> list   # [{'start','end','text','beats'}]; text is the bar in the app's format: one chord when it holds, else read_bar's tokens; 'N' becomes 'N.C.'
def parts(texts: list, line_bars=LINE_BARS) -> tuple      # (sections [{'name','chords'}], form [names]); chords as '|  C  |  G  .  Am  .  |' lines; a line equal to an earlier one reuses its part
def unsure_evidence(sections) -> dict    # {name: {'bars': [{'bar', 'chords', 'from': 'Unsure', 'readings': [{'from': 'Record', 'chords'}]}]}} for every bar, numbered from 0 per section
```

- [ ] **Step 1: Write the failing tests** with synthetic data only (see `recording_check/tests/synthetic.py` for stage 5's helpers): `key_of` on a C major and an A minor profile chroma gives `C` and `Am`, on `F#` major `F#`, on `Bb` major `Bb`; `fold_bpm(192) == 96`, `fold_bpm(48) == 96`, `fold_bpm(70.4) == 70`; `bar phase follows the chord changes` (beats every 0.5 s, changes at beats 2, 6, 10 → first start at beat 2, and an extra silent 10 s of beats before them does not move the phase); `a held bar is one chord, a changing bar keeps its beats` (`C . . .` → `C`, `C . G .` stays); `parts reuse a repeated line` (texts A B A B / C D C D / A B A B ×… → `Part 1`, `Part 2`, form `['Part 1','Part 2','Part 1']`); `every record-only bar is Unsure with the record's reading` (no bar has `from` other than `Unsure`, each has exactly one reading from `Record`).
- [ ] **Step 2: Run** `$PY -m unittest recording_check.tests.test_key recording_check.tests.test_skeleton` from `server/`; expected FAIL.
- [ ] **Step 3: Implement** both modules. `record_bars` reads each bar with `bar_beats(analysis, start, end, beats_per_bar, key)` and `read_bar([], beats, key)`; a final partial bar is dropped; bars before the first steady beat are not written.
- [ ] **Step 4: Run** the tests and the whole Python suite; expected PASS.
- [ ] **Step 5: Commit** `feat: the key and the bars read off a recording alone`.

### Task 4: A chord-over-words chart lined up with the record's bars (pure Python)

**Files:**
- Create: `server/recording_check/words.py`
- Test: `server/recording_check/tests/test_words.py`

**Interfaces:**
- Consumes: Task 3's `record_bars` output (`text`, `beats`), `chords.parse`, `agree.agrees(record: Chord, chart: Chord, chart_text: str) -> bool` (stage 5's rule, extensions/inversions as in the README), `verdict.MIN_CONFIDENCE`.
- Produces:
```python
GAP_COST = 1.0   # a chart chord or a record change with no partner
def line_up(chart_lines: list, bars: list, key: str) -> dict
# chart_lines: [{'section': name, 'chords': [...]}] in playing order (Task 1's chordLines)
# returns {'sections': [{'name','chords'}], 'form': [...], 'evidence': {name: {'from': 'Chart', 'bars': [...]}}}
```
The record's bars are collapsed to their chord changes (a change = a bar's first chord when it differs from the bar before, and every change inside a bar). A Needleman–Wunsch line-up pairs chart chords with record changes: cost 0 when `agrees`, 1 otherwise, `GAP_COST` for a gap. Each record bar then belongs to the chart line of the chart chord paired with its first change (a bar with no change belongs to the line before). Section names come from those lines; a section name played again with the same bar texts reuses its section, else gets ` 2`, ` 3`… A bar is `Chart` (no bar entry; the section's `from` is `Chart`) when every change in it is paired with an agreeing chart chord on a beat whose confidence is at least `MIN_CONFIDENCE`; it is then written in the chart's spelling. Every other bar is `Unsure` with readings `Chart` (the paired chart chords, or none when unpaired) and `Record` (the bar text).

- [ ] **Step 1: Write the failing tests**: `agreeing bars take the chart's spelling` (chart `Gm7 C` against record `Gm . . .`, `C . . .` → two bars `Gm7`, `C`, no bar entries); `a disputed bar is Unsure with both readings`; `an extra record change the chart lacks is Unsure, Record only`; `an unsure record never confirms the chart` (every beat at confidence 0.2 → every bar `Unsure`); `sections come from the chart's names and the song order repeats them` (Verse Chorus Verse with the same chords → two sections, form of three); `nothing of the chart's text but chords reaches the output`.
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Implement** `line_up`.
- [ ] **Step 4: Run** the tests and the Python suite; expected PASS.
- [ ] **Step 5: Commit** `feat: a chord chart without bar lines lined up with the record's bars`.

### Task 5: The Python command

**Files:**
- Create: `server/add_song.py`
- Test: `server/recording_check/tests/test_add_song.py`

**Interfaces:**
- Consumes: Tasks 3–4; `audio.analyze`, `check.check_song`, `check.cache_file`.
- Produces: `main(argv=None, analyze=audio.analyze, stdin=sys.stdin, stdout=sys.stdout)`. Reads one JSON request on stdin, writes one JSON answer on stdout, progress on stderr only.
```json
request:  {"title", "recording": "/path", "timeSignature"?: "4/4", "key"?: "...", "bpm"?: 96,
           "chart"?: <export-charts entry, barred>, "chordLines"?: [{section, chords}]}
answer:   {"recording": "<file name>", "duration", "key", "bpm", "timeSignature", "tuning",
           "route": "chart" | "words" | "record",
           "check"?: <check_song entry>,                       // route chart
           "sections"?, "form"?, "evidence"?}                  // routes words and record
```
`key`/`bpm` in the answer are the request's when given, else `key_from_analysis` / `fold_bpm`. Cache: `audio.CACHE_DIR`. A missing or unreadable recording exits 2 with the reason on stderr.

- [ ] **Step 1: Write the failing tests** with a fake `analyze` returning a synthetic analysis: `route record when no chart`; `route words for chord lines`; `route chart runs the check` (a chart entry from a two-bar fixture gives `check.verdict`); `the answer names the recording by file name only` (no `/` in `recording`, the full path absent from the whole answer); `a missing recording exits 2`.
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Implement `main`.**
- [ ] **Step 4: Run** the tests and the Python suite; expected PASS.
- [ ] **Step 5: Commit** `feat: add_song.py reads a recording for a new song`.

### Task 6: The one way in

**Files:**
- Create: `app/src/music/added-song.ts`, `app/scripts/add-song.mjs`
- Modify: `server/recording_check/README.md` (a section "Adding a song": the command, the chart text format, what each route marks)
- Test: `app/src/tests/music/added-song.test.ts`, `app/src/tests/scripts/add-song.test.ts`

**Interfaces:**
- Consumes: Task 1 `readChartText`, `ChartDraft`; Task 2's folder; Task 5's answer; `exportChart` (`export-charts.mjs`); `withRecordCheck` (`record-check.ts`); `slug` rule as Python's (`[^a-z0-9]+` → `-`).
- Produces:
```ts
export interface AddAnswer { recording: string; duration: number; key: string; bpm: number; timeSignature: string;
  route: 'chart' | 'words' | 'record'; check?: CheckEntry; sections?: Section[]; form?: string[]; evidence?: Song['evidence'] }
export function addedSong(input: { title: string; artist: string; draft: ChartDraft | null }, answer: AddAnswer): Song
export const songFileName = (title: string) => string   // '<slug>.json'
```
`addedSong` route `chart`: the draft's sections and form, `chordsFrom: 'Chart'`, then `withRecordCheck` with `{[title]: answer.check}`; route `words`: answer's sections/form/evidence, `chordsFrom: 'Chart'`; route `record`: answer's, `chordsFrom: 'Record'`. Every song: `capo: null`, `duration` rounded, `notes` naming the recording's file name, the route in plain words ("Bars and chords read off the recording; every bar is unsure until you hear it." / "From your chart, lined up with the recording; N bars to check." / "...the recording could not be lined up, so nothing is marked"), and the count of Unsure bars.

`add-song.mjs` usage: `node scripts/add-song.mjs --title "T" --artist "A" --recording <file> [--chart <file>] [--key K] [--bpm N] [--time 3/4] [--out <dir>] [--python <path>]`. Python defaults to `$ADD_SONG_PYTHON`, else the main checkout's venv path beside this worktree, else `python3`. It refuses (exit 1) a title in `SONGS`; it overwrites its own earlier file for the same title. It prints the file it wrote and the Unsure count.

- [ ] **Step 1: Write the failing tests**: `addedSong` per route (`chart` with a check finding gives one `Unsure` bar with readings `Chart` and `Record`; `words` keeps the answer's evidence; `record` has every bar `Unsure`; every result passes `isAddedSong`); `songFileName("Freedom! '90") === 'freedom-90.json'`; the script test runs `add-song.mjs` with `--python` pointing at a stub script (written to a temp dir in the test) that prints a fixed answer, and checks: the file lands in `--out`; `refuses a title already in the library` (exit 1, no file); `overwrites its own file` (two runs, one file).
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Implement** both, and the README section.
- [ ] **Step 4: Run** `npx vitest run && npx tsc -b`; expected PASS.
- [ ] **Step 5: Commit** `feat: add-song.mjs, one command from a recording to a song file`.

### Task 7: A real song through the route, version 4.13.0

**Files:**
- Modify: `app/src/version.ts`, `docs/sessions/add-any-song.md`, `docs/rework-shots/` (new pictures)
- No song file is committed.

- [ ] **Step 1:** Write Freedom! '90's hand chart to the scratchpad twice as chart text: with its bar lines and `Order:` line, and with bar lines removed (chord lines only, no words). Take its recording path from `server/recording_check/recordings.local.json`.
- [ ] **Step 2:** Run the command three ways (`--chart` barred, `--chart` unbarred, none) with `--title "Freedom! '90 (added)"` and `--out` in the scratchpad.
- [ ] **Step 3:** Compare each result with the hand chart and write the table into the notes file: key, bpm, bar count, share of bars whose chords agree (by stage 5's `agrees`), Unsure count, section names. The barred route must match stage 5's result for Freedom! '90 (0 findings).
- [ ] **Step 4:** Copy the record-only result into `app/src/data/added/`, run `npm run build && npm run check:release` (it must count 22 songs and pass), take pictures of the added song on an iPad Air (820 × 1180, Stage and Practice with an Unsure bar's sheet open) into `docs/rework-shots/added-song-*.png`, then remove the file from `added/`.
- [ ] **Step 5:** Version `4.13.0`; the full check `npx vitest run && npx tsc -b && npm run build && npm run check:release` (360 pages, 0 problems).
- [ ] **Step 6: Commit** `docs: Freedom! '90 through the new route; pictures; 4.13.0`.
