# Recording check

Lines each chart up with the player's own recording, beat by beat, and lists the
bars where the record plays something other than the chart. The app shows those
bars as Unsure, for the player to check by ear. What the detector hears is never
shipped as a chord.

## Run it

From `server/`, with the main checkout's Python (it has librosa, essentia and torch):

```sh
PY=../../cheetsheetForGuitarPlaying/server/.venv/bin/python   # or your own path to it
cd ../app && node scripts/export-charts.mjs > ../server/recording_check/charts.json && cd ../server
$PY check_recording.py                      # all songs
$PY check_recording.py --song "Faith"       # one song; the others keep their last result
```

Options: `--charts`, `--recordings`, `--out`, `--report`, `--cache` (defaults below).
A first run reads each recording (about 15 s a song); later runs use the cache.
The tests need no audio: `$PY -m unittest discover -s recording_check/tests -t .`

## What it reads

- `recording_check/charts.json`: the charts as bars and beats, from
  `app/scripts/export-charts.mjs` (git-ignored, regenerate it).
- `recording_check/recordings.local.json`: song title to recording path, `~` allowed.
  It is git-ignored because the paths are the player's own; copy
  `recordings.example.json` and fill it in. Where a song has several versions on
  disk, map the one whose length is closest to the song's `duration` in `songs.ts`.
- The BTC chord model, `btc_chords.py` with its `btc/` folder. It is taken from
  `$BTC_SERVER`, else this checkout's `server/` when the model is here, else the main
  checkout beside this worktree (`../cheetsheetForGuitarPlaying/server`).

## What it writes

- `app/src/data/recording-check.json`: per song `recording` (file name only),
  `checked`, `shift`, `verdict` (`lined up`, `not lined up`, `no song order`,
  `no recording`), `unchecked` (bars, as `{section, bar}`, whose every play was lost
  to a slipped line-up) and `bars`, the findings, each
  with `section`, `bar` (0 = first, as in the charts), `chords` (the chart's), `kind`
  (`chord` or `rhythm`), `record` (the record's reading in the app's bar format, at the
  chart's pitch), `confidence` and `at` (the start in seconds of every play of the
  bar). `bars` is empty unless the verdict is `lined up`.
- `docs/recording-check/report.md`: the same as tables, one per song, with each
  song's line-up `score` (its fit, 0 to 1) and its unchecked bars.
- `data/recording-check/<song>--<file>.json`: the cached analysis, keyed by title and
  recording file name (git-ignored). If `btc_chords.py` is not found the tool stops
  with an error naming `$BTC_SERVER`.

## How it works

1. **Reading the record** (`audio.py`): the tuning in cents; the beat tracker's
   beats (essentia RhythmExtractor2013); BTC's chord timeline, run on the record
   brought to concert pitch; and, per 46 ms frame, a 12-bin chroma and a 12-bin bass
   energy from a CQT from E1 over two octaves at 36 bins an octave (centre bins only,
   so a note does not leak into its neighbours), both tuned to the record.
2. **Lining up** (`align.py`): the tracker's beats are cleaned to its main pulse,
   brought to the chart's tempo (double or half time) and split into half-beat
   units. Each played bar takes its nominal units, give or take one, and a dynamic
   programme finds the cheapest run of bars, matching each unit's chroma and bass
   with the chart's chord there. Audio before the first bar and after the last is
   free. Shifts -1, 0 and +1 are tried; the best fit wins.
3. **Each beat** (`reading.py`): BTC's chord over the bass read. A beat's confidence
   is the lower of the two. An unsure bass gives root position at that low
   confidence. A sure bass outside BTC's chord is read again as the key's own triad
   holding it as root or third, if that fits the chroma about as well (Faith's
   F#/A#); else it is a passing note under BTC's chord.
4. **Second opinion** (`second_opinion.py`): a beat that differs from the chart's
   chord counts only if the beat's own chroma and bass fit the reading clearly
   better than the chart's chord. A beat where the chart has N.C. never counts.
5. **Verdicts** (`verdict.py`, `check.py`): per chart bar over all its plays; a bar
   whose evidence (or whose section's) is Ear or Record is never a finding. The
   chart's own chord over a bass outside it is a walking or passing bass note, and a
   passing chord must sit between two different chords (not two inversions of one),
   so a walking bass is never a finding. A foreign bass is only taken as walking when
   the same play also has the chart chord over its own bass; a held (pedal) bass
   still counts. A bass on the chord's own third or fifth is an inversion and agrees
   (Gm9 against Gm/Bb); a chart slash chord X/Y with X a fifth above Y matches the
   record's chord on Y (G/C against C); a chart 11th without #11 matches major, minor or sus on its root; a chart maj9
   matches its triads a major third and a fifth up (`agree.py`). A reading with a new chord on
   every beat of a bar of 4 or more beats is riff notes, never a finding. A bar played
   once needs confidence 0.85. Rhythm findings only come from bars of at most 2 chart
   chords on whole beats, when the tracker runs within 10 % of the chart's bpm. Where 3 of 5 consecutive plays (in playing
   order, hand bars included) differ, the
   line-up slipped in that stretch and those plays are dropped, unless the bar
   differs in at least 60 % of all its plays while its section lines up in another
   pass (a chart error repeated each time round); a song with more than
   a quarter of its plays dropped (out of every bar played in the song order, hand bars
   included), or with chord findings on more than a quarter of its checked chart bars
   (each chart bar counted once, hand bars left out), or a chart that does not fit in the recording, is
   `not lined up`.

## A song with no chart

For a new song with no trusted chart, the key and the bars are read off the
recording alone; every such bar ships as `Unsure`, never as fact.

- **Key and tempo** (`key.py`): the summed chroma against the Krumhansl-Kessler
  major and minor profiles (sharp names for C G D A E B F# and their minors, flat
  for F Bb Eb Ab Db and theirs); the tracker's bpm doubled or halved into 70-140.
- **Bars and parts** (`skeleton.py`): bars on the tracker's steady beats at the
  folded tempo (a tracker under 70 has each beat split, one at 140 or over counts
  two beats as one), bar 1 on the beat phase where the chroma changes most from
  the beat before (so a long intro moves nothing); each bar read beat by beat and written as one chord when it holds,
  else its beats; silent bars at either end and a final partial bar left out.
  Lines of 4 bars; a line equal to an earlier one is that part again (`Part 1`,
  `Part 2`... in playing order). Every bar is `Unsure` with the record's reading.

## A chart with no bar lines

A trusted chart written as chords over words (the words are dropped on reading)
is lined up chord by chord with the record's own bars (`words.py`). The bars are
collapsed to their chord changes; a Needleman-Wunsch line-up pairs the chart's
chords with them (0 when they agree as in stage 5's `agree.py`, 1 when not,
`GAP_COST` for a chord or a change with no partner; a bar holding the chord of the
bar before may take a chart chord, free when it takes none). Each bar belongs to
the chart line of its first paired change, else the line before; the chart's
section names give the parts, a name played again differently numbered ` 2`, ` 3`.
An unpaired record change covering no more than `QUARTER` of the bar (and ending
in it) is a passing reading: it disputes nothing and is not written. A bar is
`Chart`, in the chart's spelling on the record's beats, when every other chord in
it agrees with its chart chord on a beat of at least `MIN_CONFIDENCE` and no chart
chord the record lacks falls in it; every other bar is `Unsure`, with the chart's
reading (when a chart chord falls in it) and the record's, and is written in the
chart's chords when it has a chart reading. A section played again reuses its
section only with the same bars and the same marks; a name ending in a number is
numbered ` (2)`, ` (3)`.

## Thresholds

The same for every song; never tune one for a single song.

| Where | Name | Value | Meaning |
|---|---|---|---|
| verdict.py | MIN_CONFIDENCE | 0.5 | a beat counts only at or above this |
| verdict.py | MIN_SHARE | 0.6 | share of a bar's plays that must agree |
| verdict.py | FLOOD_SHARE | 0.25 | not lined up when chord findings exceed this share of the checked chart bars (each counted once, hand bars left out), or dropped plays exceed this share of all plays in the song order (hand bars included) |
| verdict.py | QUARTER | 0.25 | a differing run must cover more than this share of the bar, unless it is a passing chord |
| reading.py | BASS_FLOOR, BASS_FULL | 0.2, 0.5 | bass share of the band mapped to confidence 0 to 1 |
| reading.py | BASS_SURE | 0.5 | below this the bass is not trusted |
| reading.py | BASS_PARTS, HOLD_PARTS | 3, 2 | a bass note counts only when it tops 2 of the beat's 3 parts (a short hit does not) |
| reading.py | UNHELD_CONFIDENCE | 0.25 | bass confidence when no note holds |
| reading.py | REPICK_TOLERANCE | 0.1 | how much worse a key chord may fit than BTC's and still be the reading |
| second_opinion.py | SUPPORT_MARGIN | 0.05 | how much better the reading must fit than the chart's chord |
| fit.py | BASS_WEIGHT | 0.3 | the bass's part in every chord fit (line-up, re-reading, second opinion) |
| align.py | UNITS_PER_BEAT | 2 | line-up units per chart beat (half beats) |
| align.py | NO_CHORD_COST | 0.5 | a unit's cost where the chart has N.C. |
| align.py | STRETCH, STRETCH_COST | 1 unit, 0.5 | how far a bar may stretch, and its cost |
| verdict.py | ONE_PLAY_CONFIDENCE | 0.85 | a bar played once needs this much |
| verdict.py | RIFF_BEATS | 4 | a reading with a new chord on every beat of a bar this long or longer is riff notes |
| verdict.py | RHYTHM_MAX_CHORDS | 2 | rhythm only on bars of this many chart chords or fewer, on whole beats |
| check.py | RHYTHM_TEMPO | 0.10 | rhythm only when the tracker is this close to the chart's bpm |
| verdict.py | LOCAL_WINDOW, LOCAL_MOST | 5, 3 | of this many consecutive plays in playing order (hand bars included), this many differing mean the line-up slipped |
| align.py | BEAT_TOLERANCE, MAX_GAP | 0.15, 2.5 beats | when a tracker beat is off the pulse |
| skeleton.py | SILENT | 1e-6 | a beat whose chroma is this small is silence and does not vote for the bar phase |
| skeleton.py | LINE_BARS | 4 | bars per line of a record-only chart |
| words.py | GAP_COST | 1.0 | a chart chord or a record change with no partner, in the line-up of a chart with no bar lines |
| key.py | SLOWEST, FASTEST | 70, 140 bpm | the range a record-only tempo is folded into |
| align.py | SNAP | 0.15 | how near double or half time a tracker must be to keep its phase; else (a 12/8 feel) units follow the chart's tempo |
