# Recording Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Mac tool lines each chart up with the player's recording beat by beat and lists every bar where the record disagrees. Run on all 21 songs, its findings become Unsure marks in the app, plus dots where only the rhythm differs.

**Architecture:**
- A Node script exports each chart, as the app reads it, to JSON: bars, beats and the bars in song order.
- A Python package in `server/recording_check/` does the work. Its pure part parses chords, compares them and sums up each bar; its audio part reads beats, chords and bass from the recording and lines them up with the chart.
- The tool writes one generated file, `app/src/data/recording-check.json`. The app merges that file into each song's evidence when it loads, so the hand-written evidence and the generated findings stay apart and the tool can be run again.

**Tech Stack:** Node 26 (runs `.ts` data files directly), TypeScript/Vitest for the app side, and Python 3 with librosa, essentia, torch and the existing BTC chord model, using the venv of the main checkout. Python tests use the standard `unittest`, because pytest is not installed.

**Spec:** `docs/superpowers/specs/2026-11-02-playbook-rework-design.md`, part 3 ("The recording check becomes a tool…") and build step 5. Earlier plans on this branch: `2026-11-03-chord-evidence.md` (the evidence model this feeds).

## Global Constraints

- Work on branch `rework` in `/Users/krys/Documents/coding/cheetsheetForGuitarPlaying-rework`. Never push, never merge, never touch `main`.
- Code files stay at 800 lines or fewer, one job per module. Add nothing to `app/src/store/use-store.ts`. Add at most 5 lines to `app/src/data/songs.ts` (732 lines), except Task 5's dots.
- The Python environment is `/Users/krys/Documents/coding/cheetsheetForGuitarPlaying/server/.venv/bin/python`. The BTC model is in `/Users/krys/Documents/coding/cheetsheetForGuitarPlaying/server/btc`. Install nothing new.
- The recordings are the player's own files under `~/Music/Music/Media.localized/Music/`. The repository is public:
  - Never commit audio or full local paths. Generated data names a recording by its file name only.
  - The title→path map is `server/recording_check/recordings.local.json`, git-ignored, with a committed `recordings.example.json`.
  - Analysis caches go under `server/data/` (already git-ignored).
- What the detector says is never shipped as a chord. The record's reading only ever appears as an Unsure reading or as dots that leave a bar's chords as they are. ("Never ship detector-only chord changes", lesson of 2026-09-28: the detector reads riff notes as chords, and it is weak on 7ths, 9ths and slow tempos.)
- Ear wins: a bar whose evidence is Ear is never flagged.
- No rule that exists for one song: thresholds are the same for every song.
- Never quote lyrics anywhere. Sections are named by part.
- Release check before every commit that touches layout or song data: `cd app && npm run build && npm run check:release`.

## Rulings (mine; the player skipped the questions)

- **What counts as disagreeing.** Chords are compared by root, chord class (major, minor, diminished, augmented, suspended, power, no chord) and bass note. Differences only in 7ths, 9ths and other extensions are not flagged, because the detector cannot hear them reliably. Cost if wrong: missed quality errors, which the player's ear catches.
- **Two kinds of finding.**
  - `chord`: the record has a different chord, or a passing chord the chart lacks. It becomes an Unsure bar.
  - `rhythm`: the same chords, changing on other beats. It becomes dots in the chart, written into `songs.ts` in Task 5, and never a mark.
- **One verdict per bar of the chart.** A bar's findings are summed over every time it is played in the song order. A finding needs most of those plays to agree.
- **A flood means the line-up failed.** When more than 25 % of a song's chart bars come out `chord`, the song is reported "not lined up" and gets no marks. Riff and vamp songs (Papa) are where the detector fails. Cost if wrong: a song left unchecked, named in the report.
- **No song order, no check.** A song with no `form`, or a form naming a part the chart lacks, is reported "no song order" and gets no marks.
- **Pitch search.** The check tries the chart at −1, 0 and +1 semitones against the recording and uses the best fit. Recordings run up to about half a semitone sharp (Faith +34 cents, Fastlove +48). Readings are written at the chart's own pitch.
- **Hand evidence wins.** Generated findings are skipped for a bar whose hand evidence is Ear or Record, since an earlier careful bass read counts as Record.
- **When the chart has moved on.** A finding whose `chords` no longer match the chart's bar is dropped when the app merges it. This is the same rule as stage 4's marks.
- **Version** 4.12.0.

## Review Focus

1. A riff or vamp song where the detector hears notes as chords floods with flags. The song must come out "not lined up", not 40 marks. Test: Task 2, "a song with over a quarter of its bars flagged is not lined up".
2. A recording slightly sharp or flat (Faith +34 cents) must still line up at the chart's pitch, and its readings must be spelled in the song's key. Test: Task 3's Faith validation, plus Task 2, "readings are spelled at the chart's pitch".
3. A free-time opening, a fade or silence that is not in the chart must not shift every bar after it. Test: Task 3's Faith validation, since Faith opens with an organ in free time and has a stop bar.
4. A finding whose bar the chart no longer reads (an edited or fixed chart) must not show a stale mark. Test: Task 4, "a finding about other chords than the bar's is dropped".
5. A song with no recording on disk, or no song order, must be reported and skipped while the other songs go on. Test: Task 3, "a missing recording is reported, not fatal".

---

### Task 1: Charts out of the app, as the tool reads them

**Files:**
- Create: `app/scripts/export-charts.mjs`. Run with `node scripts/export-charts.mjs > ../server/recording_check/charts.json`. It imports `../src/data/songs.ts` and `../src/music/bars.ts` directly; Node 26 strips their types.
- Create: `app/src/tests/scripts/export-charts.test.ts`
- Modify: `.gitignore`, adding `server/recording_check/charts.json` and `server/recording_check/recordings.local.json`

**Interfaces:**
- Produces `exportChart(song: Song): ChartExport`, exported from the script, and the script prints `ChartExport[]` for `DEFAULT_SONGS`:

```ts
interface ChartExport {
  title: string; key: string; bpm: number; timeSignature: string
  /** Beats in a bar: the time signature's top number, or top / 3 in 6/8, 9/8, 12/8 (the tempo counts dotted quarters). */
  beatsPerBar: number
  chordsFrom: string | null
  sections: { name: string; from: string | null; bars: ExportBar[] }[]
  /** Every bar in playing order: the song order, each section's lines, each line as many times as its (xN), % written out as the bar it repeats. Empty when there is no usable song order. */
  played: { section: string; bar: number }[]
  /** Why `played` is empty: 'no song order' | 'song order names a missing part', else null. */
  skipped: string | null
}
interface ExportBar {
  bar: number            // as music/evidence.ts numbers it: from 0, every line in bars, % included
  chords: string         // as barChords writes it: tokens without repeat counts, one space apart
  /** The chords on the bar's beats, the bar dividing evenly among its tokens; % is the bar it repeats. */
  slots: { chord: string; start: number; length: number }[]  // start and length in fractions of the bar, 0..1
  evidence: string | null // the bar's own source when it has one ('Ear', 'Record', …)
}
```

- [ ] **Step 1: Write the failing tests.**

```ts
it('numbers bars as the evidence does and writes the beats as fractions', () => {
  const faith = exportChart(by('Faith'))
  const pre = faith.sections.find(s => s.name === 'Pre-Chorus')!
  expect(pre.bars[5]).toEqual({ bar: 5, chords: 'B F#/A# G#m .', evidence: 'Ear',
    slots: [{ chord: 'B', start: 0, length: 0.25 }, { chord: 'F#/A#', start: 0.25, length: 0.25 }, { chord: 'G#m', start: 0.5, length: 0.5 }] })
  expect(pre.bars[0].slots).toEqual([{ chord: 'E', start: 0, length: 1 }])
})
it('a bar of % is the bar it repeats', () => { /* Faith Intro bar 1: slots of B, chords '%' */ })
it('plays the song order through, lines as many times as their (xN)', () => {
  // I'm Your Man: played starts with the Intro's 8 bars, then the Verse's 4 bars twice (bars 0,1,2,3,0,1,2,3)
})
it('bars an undotted bar shares equally', () => { /* 'E  B' → two slots of 0.5 */ })
it('a song without an order is skipped, with the reason', () => { /* form undefined → played [], skipped 'no song order' */ })
it('beats per bar: 4 in 4/4, 2 in 6/8, 4 in 12/8', () => { /* fixtures */ })
it('every shipped song exports, and the bars of its order match its length', () => {
  // for each song with a form: played.length === formBars(title) (tests/songs-in-bars-helpers.ts)
})
```

- [ ] **Step 2: Run them and see them fail.** `cd app && npx vitest run src/tests/scripts/export-charts.test.ts`
- [ ] **Step 3: Implement it.** Reuse `barsOf`, `beatsOf`, `hasBars`, `isRepeatCount` and `REPEAT_BAR` from `music/bars.ts`. The bar numbering must equal `barsOfSection` in `music/evidence.ts`; a test compares the two over every shipped song.
- [ ] **Step 4: Run it to pass, then the full suite.** `npx vitest run && npx tsc -b`
- [ ] **Step 5: Commit.** `git commit -m "feat: export charts as bars and beats for the recording check"`

---

### Task 2: Comparing a bar with the record (pure Python)

**Files:**
- Create: `server/recording_check/__init__.py`
- Create: `server/recording_check/chords.py`
- Create: `server/recording_check/verdict.py`
- Test: `server/recording_check/tests/test_chords.py`, `server/recording_check/tests/test_verdict.py`. Run with `cd server && $PY -m unittest discover -s recording_check/tests -t .`, where `$PY` is the venv python.

**Interfaces:**
- `chords.py`:
  - `parse(symbol: str) -> Chord | None`, a frozen dataclass `Chord(root: int, kind: str, bass: int)`. `kind` is one of `maj min dim aug sus power none`. `N.C.`, `N` and `X` give `Chord(-1, 'none', -1)`; text that is not a chord gives `None`.
  - It understands both the chart's spelling (`F#/A#`, `Bbmaj9(#11)/D`, `G#m7b5`) and BTC's (`A#:min7`, `D:maj/5`, `N`).
  - `same(a: Chord, b: Chord) -> bool`: equal root, kind and bass.
  - `spell(chord: Chord, key: str) -> str`: a plain name in the key's sharps or flats (`Bbm`, `F#/A#`, `N.C.`).
  - `shift(chord: Chord, semitones: int) -> Chord`.
- `verdict.py`:
  - `read_bar(chart_slots, record_beats, key) -> str`. The record's reading of one played bar, written as a bar the app reads: one token per beat, a chord where it changes, `.` where it holds, e.g. `B F#/A# G#m .`.
    - `record_beats` is a list of `(chord: Chord, confidence: float)`, one per beat.
    - A chord the record agrees with keeps the chart's own spelling.
    - Any other chord is spelled with `spell` in the song's key.
  - `bar_finding(chart_slots, plays: list[list[tuple[Chord, float]]], key, min_confidence: float, min_share: float) -> Finding | None`.
    - `Finding(kind: 'chord' | 'rhythm', record: str, confidence: float)`.
    - `None` means the bar agrees.
    - It is `chord` when, in at least `min_share` of the plays, a beat run of at least one beat at or above `min_confidence` holds a chord that is `same` as none of the bar's chart chords. The run must also cover more than a quarter of the bar, or be a passing chord the chart lacks.
    - It is `rhythm` when the chords agree but most plays change chord on beats other than the chart's.
    - `record` is the reading the most plays give.
  - `song_verdict(findings: dict, bar_count: int, flood_share=0.25) -> 'lined up' | 'not lined up'`.
- Thresholds are parameters with defaults in `verdict.py`. Task 3 sets the defaults from its calibration.

- [ ] **Step 1: Write the failing tests.** For example:

```python
def test_parses_both_spellings(self):
    self.assertEqual(parse('F#/A#'), Chord(6, 'maj', 10))
    self.assertEqual(parse('A#:min7'), Chord(10, 'min', 10))
    self.assertEqual(parse('Bbmaj9(#11)/D'), Chord(10, 'maj', 2))
    self.assertEqual(parse('N.C.'), Chord(-1, 'none', -1))
def test_sevenths_are_the_same_chord(self): self.assertTrue(same(parse('Am7'), parse('A:min')))
def test_a_slash_bass_is_not(self): self.assertFalse(same(parse('F#/A#'), parse('F#')))
def test_readings_are_spelled_at_the_chart_pitch(self):
    # chart B | G#m, record beats in Bb shifted +1 back: spelled 'B . G#m .' in key B; in key Bb: 'Bb . Gm .'
def test_a_missed_passing_chord_is_a_chord_finding(self):
    # chart bar 'B G#m' (halves), record per beat B, A#/F#… : F#/A# on beat 2 in 2 of 2 plays → Finding('chord', 'B F#/A# G#m .', …)
def test_one_play_out_of_three_is_not_enough(self): ...
def test_a_low_confidence_difference_is_not_a_finding(self): ...
def test_extension_only_differences_agree(self): ...
def test_same_chords_on_other_beats_is_rhythm(self):
    # chart 'E B' (halves), record E E E B in most plays → Finding('rhythm', 'E . . B', …)
def test_a_song_with_over_a_quarter_of_its_bars_flagged_is_not_lined_up(self):
    self.assertEqual(song_verdict({i: chord_finding for i in range(9)}, 32), 'not lined up')  # 9/32 > 25 %
    self.assertEqual(song_verdict({i: chord_finding for i in range(8)}, 32), 'lined up')
def test_rhythm_findings_do_not_count_toward_a_flood(self): ...
```

- [ ] **Step 2: Run them to see them fail. Implement. Run them to pass.**
- [ ] **Step 3: Commit.** `git commit -m "feat: compare a chart's bar with what the record plays"`

---

### Task 3: Reading the recording, lining it up, and the tool

**Files:**
- Create: `server/recording_check/audio.py`. It holds the analysis of one recording, cached as JSON under `server/data/recording-check/<slug>.json`:
  - the beat times;
  - the BTC chord timeline, using `detect_chords` in the main checkout's `server/btc_chords.py`, imported by path;
  - the bass note per beat, from a CQT from E1, as done for Faith on 2026-11-02;
  - a 12-bin chroma per beat;
  - the tuning in cents.
- Create: `server/recording_check/align.py`, which lines up the chart's `played` bars with the recording's beats.
- Create: `server/check_recording.py`, the command line: `$PY check_recording.py [--song "<title>"] [--charts recording_check/charts.json]`.
- Create: `server/recording_check/recordings.example.json`
- Create: `server/recording_check/README.md`, covering how to run it, what it reads, what it writes and the thresholds.
- Test: `server/recording_check/tests/test_align.py`, with synthetic beats and chroma and no audio, and `test_cli.py`.

**Interfaces:**
- Consumes Task 1's `charts.json` and Task 2's `parse`, `same`, `shift`, `read_bar`, `bar_finding` and `song_verdict`.
- `align(chart: dict, analysis: dict) -> Alignment`. `Alignment(shift: int, bars: list[tuple[float, float]], score: float)` holds one `(start, end)` time per entry of `chart['played']`.
  - It is a subsequence alignment: unmatched audio before the first bar and after the last is allowed.
  - Bar lengths are held near `beatsPerBar` beats at the chart's bpm, after the recording's beats are brought to the chart's tempo; trackers often give double or half time.
  - It searches shifts −1, 0 and +1.
  - The method (dynamic time warping on beat chroma and bass against each played beat's expected chord, or better) is the builder's call. It is proven by the validation below.
- The tool writes `app/src/data/recording-check.json`:

```json
{ "<title>": { "recording": "<file name>", "checked": "YYYY-MM-DD", "shift": 0, "verdict": "lined up",
  "bars": [ { "section": "Pre-Chorus", "bar": 5, "chords": "B G#m", "kind": "chord",
              "record": "B F#/A# G#m .", "confidence": 0.81, "at": [63.2, 104.9] } ] } }
```

  - `verdict` is `lined up`, `not lined up`, `no song order` or `no recording`.
  - `bars` lists only the findings. It is empty unless the verdict is `lined up`.
  - `at` gives the start in seconds of every play of the bar, so the player can find it on the record.
  - It also writes `docs/recording-check/report.md`: one table per song of each finding, with section, bar, chart, record, kind, confidence and times, plus each song's verdict and shift.
- No bar whose evidence is Ear or Record is ever a finding.

- [ ] **Step 1: Write the failing tests.**
  - `test_align.py`: a synthetic chart of 8 played bars against synthetic beat chroma. The chart has 2 bars of silence before it, a tempo tracked at double time, and a +1 semitone shift. The test asserts the bars' starts within half a beat, and `shift == 1`.
  - `test_cli.py`:
    - "a missing recording is reported, not fatal": one song mapped to a file that does not exist gives verdict `no recording`, and the next song is still checked.
    - "Ear and Record bars are never findings".
- [ ] **Step 2: Implement it.** Run the unit tests to pass.
- [ ] **Step 3: Validate on Faith with the real recording.** These are the ground truth for the calibration. Write the runs and numbers in the report.
  1. Faith as charted: Pre-Chorus bar 5 (Ear) is not a finding. The Pre-Chorus walks down B, A#, G# in the bass on the record (bass read, 2026-11-02).
  2. Faith with Pre-Chorus bar 5 replaced by `B  G#m` in a scratch copy of `charts.json`, with its Ear evidence removed: bar 5 must come out a `chord` finding whose `record` holds `F#/A#`.
  3. All of Faith's bars line up: each section's first bar starts within one beat of the times from the 2026-11-02 bass read, or of the times you hear in the chroma (Intro after the organ, about 0:16 on the 2010 remaster).
  - Set the default thresholds in `verdict.py` so that runs 1 and 2 both pass, and say what they are.
- [ ] **Step 4: Run it on all 21.** This is a calibration report only; nothing goes into the app yet. List findings per song. Expect the songs confirmed at 90 % or more on 2026-09-28 to have few findings: Freedom! '90, Club Tropicana, Jesus to a Child, I'm Your Man, Father Figure, Too Funky, Careless Whisper, Waiting (Reprise), Roxanne, Wake Me Up, Faith and Last Christmas. Expect Papa to come out `not lined up` or with few findings.
  - If the confirmed songs average more than 3 `chord` findings each, the thresholds are wrong. Raise them, rerun Faith's runs 1 and 2, and say so.
  - Never tune a threshold for one song.
- [ ] **Step 5: Commit** the code, the README and the example map. Do not commit the generated JSON, the report or the cache yet; Task 5 does that. `git commit -m "feat: the recording check lines charts up with the record"`

---

### Task 4: The app reads the recording check

**Files:**
- Create: `app/src/music/record-check.ts`
- Create: `app/src/data/recording-check.json`, holding `{}` until Task 5 fills it.
- Modify: `app/src/data/songs.ts`. Rename the hand list to `SONGS`; `DEFAULT_SONGS` becomes `withRecordCheck(SONGS, RECORD_CHECK)`. That is 5 lines or fewer.
- Modify: `app/src/components/sheets/SongFacts.tsx`. When the song has a check, add a row `Record check: <recording file name>, <checked date>`, plus ` · not lined up` / ` · no song order` when that is the verdict.
- Test: `app/src/tests/music/record-check.test.ts`

**Interfaces:**
- `type RecordCheck = Record<string, { recording: string; checked: string; shift: number; verdict: string; bars: CheckBar[] }>`
- `CheckBar = { section: string; bar: number; chords: string; kind: 'chord' | 'rhythm'; record: string; confidence: number; at: number[] }`
- `withRecordCheck(songs: Song[], check: RecordCheck): Song[]` returns new songs, never mutating its input. For each `chord` finding on a `lined up` song, it adds to `evidence[section].bars` a `BarEvidence`:

```ts
{ bar, chords, from: 'Unsure',
  readings: [{ from: <the bar's section source ?? song.chordsFrom>, chords }, { from: 'Record', chords: record }] }
```

  - It skips a finding when the bar has hand evidence (any source), when the chart's bar no longer reads `chords`, or when the two readings are the same after `barChords`.
  - `rhythm` findings are not merged.
- `recordCheckOf(title: string): RecordCheck[string] | undefined`, for SongFacts.

- [ ] **Step 1: Write the failing tests.**
  - "a chord finding becomes an Unsure bar with both readings", where `openUnsure` then lists it.
  - "a finding about other chords than the bar's is dropped".
  - "hand evidence wins".
  - "a song not lined up gets no marks".
  - "rhythm findings make no marks".
  - "the input is not changed".
  - "More names the recording and the date".
- [ ] **Step 2: Implement, then run the tests, the full suite and the release check.** `npx vitest run && npx tsc -b && npm run build && npm run check:release` must give 0 problems and no pictures changed, since the JSON is still `{}`.
- [ ] **Step 3: Commit.** `git commit -m "feat: the app marks the bars the recording check flags"`

---

### Task 5: Run it on all 21, mark the bars, add the dots

**Files:**
- Modify: `app/src/data/recording-check.json` (generated)
- Create: `docs/recording-check/report.md` (generated)
- Modify: `app/src/data/songs.ts` (dots only)
- Modify: `app/src/version.ts`, setting `4.12.0`
- Test: `app/src/tests/data/dots.test.ts`

- [ ] **Step 1: Run the tool on all 21.** From `app/`, export the charts first: `node scripts/export-charts.mjs > ../server/recording_check/charts.json`. Then, from `server/`, run `$PY check_recording.py`.
- [ ] **Step 2: Write in the dots.** For each `rhythm` finding with confidence at or above the `chord` threshold, rewrite that bar in `songs.ts` as its `record` reading, but only when the reading's chords, in order and leaving out dots, equal the bar's chords. Bars in a song's evidence as Ear are left alone.
  - Test `dots.test.ts` checks every song against the commit before this task (load the old `songs.ts` text with `git show <base>:app/src/data/songs.ts` in the test setup, or keep a snapshot of every bar's chords without dots as a JSON fixture made before editing). It asserts:
    - every bar's chords without dots are unchanged;
    - only bars named in `recording-check.json` as `rhythm` gained dots.
  - Rerun the tool afterwards: those findings must be gone.
- [ ] **Step 3: Check the marks.** Open three marked songs in the app (`npm run dev`, Practice) and confirm each mark sits on the bar the report names and that its sheet shows both readings. Put pictures of two in `docs/rework-shots/record-check-*.png`.
- [ ] **Step 4: Version, then the full checks.** Set `APP_VERSION = '4.12.0'`. Run `npx vitest run && npx tsc -b && npm run build && npm run check:release`. It must give 0 problems; the pictures changed must be only the songs that gained marks or dots, and the report lists them.
- [ ] **Step 5: Commit.** `git commit -m "data: the recording check on all 21 songs: unsure bars and dots; 4.12.0"`
