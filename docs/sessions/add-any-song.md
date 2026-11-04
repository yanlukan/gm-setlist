# Adding any song (rework step 6)

## Goal
One way in on the Mac: the player's recording, plus a trusted chord chart if one exists, becomes a song file in the beat format with every bar marked by its evidence. It opens in the app like any of the 21; the player confirms the Unsure bars by ear. No song needs code. Version 4.13.0.

## Decisions
See "Rulings" in docs/superpowers/plans/2026-11-04-adding-any-song.md, plus these made during the build:
- Added songs join the library, not the gig list (Edit list puts one in).
- Record-only bar phase: beat-to-beat chroma change (16/18 lined-up songs right); bars cut at the folded tempo; wholly N.C. bars trimmed at the record's ends.
- Words route: stage 5's QUARTER rule for passing readings, in and after the line-up; a bar is trusted only when it holds one chord the chart names and the record is confident; a weak bar is Unsure with one Chart reading; a bar with a change inside it is Unsure with two different readings.
- An Unsure bar may hold one reading; two or more must differ. The sheet says "the recording only" or "the recording could not confirm it".
- The half-beat grid move was tried and reverted (worse end to end).
- The command refuses a title already shipped, an empty slug, another song's file, an Order line naming a missing part; it warns when some parts have no bar lines.
- Parked: an inline `Name: chords` line of capitalised words could make a lyric word a part name; tighten to known part words later.

## Progress
- 2026-11-04: plan written (7 tasks), commit 23a43fc.
- Task 1 chart text reader (ddb28f1, 6c5ddc1): word lines dropped, a lyric ending in ":" never becomes a part name, repeated parts with other chords get "Name 2".
- Task 2 added songs folder (2a6befa, a0487ff): app/src/data/added/*.json join the library; bad files skipped; release check counts them.
- Task 3 key and bars off the record (68bd8cc, 56f2e87): bar phase rule measured on the 18 lined-up songs (16 right against stage 5's line-up); bars cut at the folded tempo.
- Task 4 chord-over-words line-up (8803ea4, 55df8bc, f28a3c5): stage 5's QUARTER rule for passing readings; Freedom! '90 test run 86 of 144 bars Unsure.
- Task 5 add_song.py (a2acae9, bb185e4, c682879): stdout only the answer, bad input exits 2, paths cut to file names.
- Task 6 add-song.mjs (18fe415): one command; app modules loaded with Vite's runnerImport; chord lines repeat at each play.
- Final review fix wave 91c449b: stricter added-file check, Order and unbarred-part messages, `Name: chords` lines, README "what happens next", write-point guards.
- Task 7 validation and its fixes (d5afd37, 8613fa4 revert of 5a3c427, 9e059b1, 5954f29, 61225d2, 4aa20e0): see below. Version 4.13.0. Pictures docs/rework-shots/added-song-*.png.

## Validation: Freedom! '90 fed in as if new (2026-11-04)

Run three ways with `node scripts/add-song.mjs --title "Freedom! '90 (added)" …`, output to the scratchpad (not shipped), compared bar by bar in playing order with the hand chart in songs.ts (stage 5's `agrees` rule: a bar matches when its first chord and every chord in it agree with the hand chart's bar there).

| Route | Key | BPM | Bars | Parts | Match hand chart | Unsure | Trusted bars that match |
|---|---|---|---|---|---|---|---|
| Hand chart with bar lines (`--chart`, app format) | C | 92 | 144 (hand 144) | 8 | 144/144 | 0 | 144/144 |
| Same chart, bar lines taken out (chords per line, as a web chart) | C (chart) | 92 (record) | 144 | 14 | 86/144 | 125 (87 two readings, 38 one chart reading) | 16/19 |
| Recording only | C (record) | 92 (record) | 144 | 36 | 53/144 | 144 | — |

- Key and tempo read off the record agree with the hand chart (C, 92).
- With bar lines the route equals stage 5's check (0 findings). A wrong bar planted in that chart (Chorus bar 2 `Am` for `Bb`) came out as the one Unsure bar, readings Chart `Am`, Record `Bb/A Bb . .`.
- Without bar lines the record decides where bars fall, and on this record its bars read about a beat late (`C Bb . .` where the hand chart has `Bb`). A bar is trusted only when it holds one chord the chart names and the record is confident; 3 trusted bars are still wrong (a held `C` where the hand chart has `F/C C`).
- Record only: every bar Unsure, as it must be; 36 parts because no 4-bar line repeats exactly.
- Tried and dropped: moving the beat grid half a beat when the tracker sits on off-beats. It picked the better grid on 15 of 18 lined-up songs but read fewer beats right overall (4045 vs 4064), so it was reverted (8613fa4).
- The bar phase rule (beat-to-beat chroma change) is right on 16 of 18 lined-up songs against stage 5's line-up; wrong on Outside and I Can't Make You Love Me.
- The app: the added copy opened with 125 marks; the release check with it in the list checked 376 pages, 0 problems; without it 360, 0.

Lesson: the barred chart is the route to trust. Without bar lines, or without a chart, the tool gives a correct key, tempo and bar count but the player has most bars to confirm.

## Open questions
None blocking. For the player: added songs are not put in the gig list; add one with Practice → Songs → Edit list.

## What's left
Done: final review (no Critical, 6 Important fixed in 91c449b), scoped re-review clean; 1193 app tests, 173 Python tests, release check 360 pages / 0 problems. Follow-up: the record's bars read about a beat late on Freedom! '90 (BTC's chords come late against the beats); the words and record routes would gain most from fixing that.
