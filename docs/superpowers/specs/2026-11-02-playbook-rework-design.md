# PlayBook rework: charts you can trust, for any song

2026-11-02. The player skipped the questions ("skip questions"), so every call
below is mine unless it quotes them. Their words that set the goal:

- "i hate this app to be honest. im more nervous using it and annoyed"
- "i need the app to be built smart that will work with other songs too. no
  bull shit, no useless chords shapes at the front of the line. the app needs
  total rework"

## Why

On 2026-11-02 the first song of the set, Faith, was missing a chord (the
B F#/A# G#m walk-down). Fixing it then broke the layout twice in one hour.
That is not one bug. It comes from four things in how the app is built:

1. **No evidence behind a chord.** A chart is plain text. Nothing says where
   a chord came from or whether anyone checked it against the record, so a
   chart that is 97 % right looks exactly like one that is 100 % right. Every
   review so far checked that the right chords appear somewhere in the song,
   never that each bar holds the right chord.
2. **No beats.** A bar is a list of chords with no rhythm. "B F#/A# G#m"
   cannot say that G#m takes the second half of the bar, so the layout splits
   the bar in equal thirds and then has to guess how to wrap it.
3. **Layout by patching.** The fit code has grown special cases (two lines
   for crowded bars, a chord a line in Practice, bars shrunk alone, the odd
   chord out). Each fix for one song changes others, and nothing checks every
   song before a release.
4. **Hand-tuned per song.** Shapes, notes, cues and tests are written song by
   song (tests pin Faith's exact chord list). A new song gets none of that, so
   the app only works well for the 21 it was tuned on.

## Goals

- A chart shows only what the player needs to play the song: chords in bars,
  in time, the parts, the song order.
- Every chord in a chart has a source, and a bar nobody has confirmed is
  visibly marked, never shown as fact.
- A new song gets the same quality as the 21: one way in, with the same
  checks, no hand-tuning.
- The layout follows from the music (bars and beats), with one rule for
  every song, checked on every song at the iPad sizes before any release.
- The live app keeps working, unchanged, until the new one has passed those
  checks.

## Non-goals

- No new features beyond these (no tab, no audio playback, no sync).
- The GX-10 tone work stays where it is (branch gx10, gx10/team).
- No change to setlists, backups or the player's saved data format, other
  than what the beat format needs (with a migration).

## Anti-goals (fails even if it "works")

- A chord shown that came from a guess, with nothing saying so.
- A chart that looks different from one release to the next without the
  player asking for it.
- Chord diagrams or other panels in front of the chart by default.
  (Changed 2026-11-23, 5.2.0: the player asked where the shapes had gone and chose a row of the
  song's shapes under the chart in Practice, with a bar to hide it. Nothing sits in front of the
  chart; Stage still has no shapes.)
- Any rule that exists for one song.

## Constraints

- Stage device: 11-inch iPad Air, 820 × 1180 points, upright and on its side
  (player, 2026-10-13). Also checked at 1024 × 1366 and a phone.
- Chords never under 20 px on the iPad (player, 2026-10-13).
- Same web app and address (yanlukan.github.io/gm-setlist): moving it would
  wipe the iPad's saved data.
- Never quote lyrics anywhere (sections are named by part, never by words).
- Files stay at 800 lines or fewer, one job per module.

## Design

### 1. The chart format: bars with beats

Each bar holds its beats. A chord starts on a beat and lasts until the next
chord or the bar line; a dot is a beat with no new chord (ChordPro grid
style, which the app already reads):

```
| E . . . | B . F#/A# . G#m . . . |
```

(Faith's pre-chorus bar: each app bar is two of the book's bars, so 8 beats.)
A bar written without dots keeps today's meaning: its chords share it
equally. So every existing chart and every saved copy still reads the same,
and dots are added where the rhythm matters. My call: no forced migration;
the 21 charts get dots only where a bar holds more than one chord, from the
recording (part 3).

### 2. One layout rule

- Every bar is a row of beat columns. A chord sits in the column of its beat.
- The whole chart is one size: the largest from 44 px down to 20 px at
  which the chart fits the screen. No bar is ever shrunk alone.
- A bar whose chords do not fit their beats at that size staggers: its chords
  alternate between a top and a bottom line, each still starting under its
  own beat, and each may run on over the empty beats of its own line. Faith's
  bar reads B (top, beat 1), F#/A# (bottom, beat 2), G#m (top, beat 3). No
  chord ever starts a line on its own at the left, where it would read as a
  new bar (player, 2026-11-02: "this g#m looks like its alone in new tact").
- The fit code is rewritten around this rule; the current special cases
  (two chords a line, one a line, odd chord out, shrink alone, two size rules for Stage and Practice)
  go away.

### 3. Chords with evidence

Each section, and each bar where they differ, carries where its chords came
from:

- **Ear**: the player confirmed it (they win over everything).
- **Book**: the songbook.
- **Record**: read off the recording bar by bar (chords and bass, as done for
  Faith on 2026-11-02).
- **Chart**: a published chord chart.
- **Unsure**: sources disagree, or only one weak source.

On the chart an Unsure bar gets a small mark. Tapping it shows what each
source says, and one tap settles it (that becomes Ear). Nothing else shows
the source on stage.

The recording check becomes a tool, not a one-off: given a song's chart and
the player's recording, it lines the chart up with the record beat by beat
and lists every bar where the record disagrees (a different chord, a missed
passing chord, a change on a different beat). It runs on the Mac, from the
existing analysis code (server/analyze.py and the bass reading). It is run
on all 21 songs as part of this rework, and the bars it flags are marked
Unsure until the player hears them.

### 4. Adding any song

One way in, on the Mac: a recording (the player's file) plus, if there is
one, a chord chart they trust. The tool reads key, tempo, bars and chords
from the record, lines the chart up with it, and writes a chart in the beat
format with every bar marked by its evidence. The song then opens in the app
like any of the 21, and the player confirms the Unsure bars by ear. No song
needs code.

### 5. The screens: chart first

- The chart screen is the chart: title line (title, key, tempo as text),
  song order, the bars, and the bottom bar. Nothing in front of it.
- Chord diagrams are not shown by default, on any screen. Tapping a chord
  opens its shape(s) over the chart; tapping away closes it. Shapes come
  from one general rule (root or bass at the bottom, familiar barre or open
  forms, the songbook's own boxes when the song has them); no per-song code.
- Everything else (key, capo, guitar, edit, notes, GX-10 sound) moves into
  the existing More sheet. Stage and Practice stay separate screens (player,
  2026-10-13) but share the one chart and the one layout rule.

### 6. Release checks

Before any release, an automatic check opens every song in the built app at
820 × 1180, 1180 × 820, 1024 × 1366 and a phone, and fails if any chord is
under 20 px, runs past its bar line, overlaps another, or leaves its beat
column; it also saves a picture of every song so a change that moves
anything shows up as a difference before it reaches the iPad. Tests check
rules, not one song's chord list.

## Build order (each step its own release on the branch, live only at the end)

1. Beat format: read and write dots, old charts unchanged.
2. Layout rule and the release check (the check first, so step 2 is judged by it).
3. Chart-first screens: diagrams on tap only, the rest into More.
4. Evidence on sections and bars, the Unsure mark and its tap.
5. The recording tool, run on all 21; dots and Unsure marks from it.
6. Adding a song through the tool.
7. Switch the live app over, with a backup of the iPad's data first.

## Left to the builder

Names of fields and modules, how the evidence is stored (per section with
per-bar overrides is my suggestion), the exact look of the Unsure mark, and
how the More sheet orders its items (grouped by "this song" then "the app").
