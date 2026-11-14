# Late bars in "add any song" (rework step 6 follow-up)

## Goal
A song added from a chart without bar lines, or from the recording alone, showed bars about a beat late: on Freedom! '90 `C Bb . .` where the hand chart has `Bb`. Find a general rule (never one tuned to a song), measured on all lined-up songs against stage 5's bar starts and the beats read right end to end. Keep it only if neither gets worse and at least one gets better. Then rerun the Freedom! '90 validation from `add-any-song.md`. Branch `late-bars`.

## What the measurements found
- **The bar starts are not late.** On Freedom! '90 the record route's bar starts sit on stage 5's line-up starts for 140 of 144 bars. What was late is what each bar *shows*. Its first beat reads the chord before it (`C/Bb Bb . .`, `F/A Bb . .`), and its last beat often reads the chord after it (`C . . C/E`, `C . . Am`).
- **Why:** the record blurs at the bar line. Two causes:
  - The bass CQT's low-note windows are long (about 1.25 s at E1), so a bass note spills over the line. Then the beat reading re-picks a slash chord (`F/A` over BTC's `Bb`).
  - BTC's changes come late. Measured as the timeline shift at which BTC's chords best fit the record's own chroma, BTC runs late on 16 of 18 songs, typically 0.1 s (0.1–0.3 of a beat).
- **Per beat of the bar**, beats read right were 0.49, 0.58, 0.55, 0.44 (beats 1 to 4): both edges are worst.
- **The bar phase rule is already right where the grid allows it.** Stage 5's starts sit half a beat off the tracker on Fastlove, Amazing and part of A Different Corner, Too Funky and Everything She Wants. That is the half-beat grid question 8613fa4 already settled.
  - Outside picks phase 2 against truth 3 by a wide margin (chroma change 21.4 against 13.7).
  - I Can't Make You Love Me is a half-tempo bar (chart 58 bpm, tracker 116).
  - No bar-start rule tried here beat the current one. Task 3 had already tried 16.

## Measure
Scratch scripts are in this session's scratchpad (not committed). They use the same method as the add-any-song Task 3 and Task 7 evaluations, so 4064 is the same number as there.
- **Songs:** the 18 lined-up songs with a cached analysis. Somebody to Love and Waiting (Reprise) are skipped, as before.
- **Bar starts:** stage 5's line-up bar starts that have a record bar start within a quarter beat (1979 bars).
- **Phase right:** the record's phase against the line-up's majority phase. The truth counts only starts within a quarter beat of a tracker beat, so this reads 14/18 where Task 3's nearest-beat truth reads 16/18. The rule's picks are the same.
- **Beats right:** per lined-up chart bar, the record bar that overlaps it most is read beat by beat against the hand chart (`same` or `agrees`, confidence at least 0.5).
- **Bars match:** compare.py's rule. The first chords agree, and every record chord agrees with one of the hand bar's chords.

| Rule | Phase right | Bar starts | Beats right | Bars match |
|---|---|---|---|---|
| current (before) | 14/18 | 1046/1979 | 4064 | 748/1979 |
| BTC moved back by its own chroma-fit lag | 14/18 | 1046 | 4083 | 775 |
| BTC moved a fixed 0.05 / 0.10 / 0.15 s | 14/18 | 1046 | 4082 / 4083 / 4080 | — |
| narrower reading windows inside each beat (BTC and/or bass, 1/8 or 1/4 off each side) | 14/18 | 1046 | 3972–4089 | — |
| edge beat equal to the neighbouring bar's chord moves to the bar line | 14/18 | 1046 | 4098 | 856 |
| same, chord compared by root and kind | 14/18 | 1046 | 4122 | 911 |
| same, or the same bass as the neighbour | 14/18 | 1046 | 4156 | 951 |
| any edge beat unlike its inner neighbour takes its chord | 14/18 | 1046 | 4246 | 1218 |
| **edge beat unlike the two inner beats, which agree, takes their chord (kept)** | **14/18** | **1046** | **4320** | **1139** |
| the kept rule plus the BTC lag shift | 14/18 | 1046 | 4327 | 1131 |

Kept rule, per song (beats right, bars match; before → after):

| Song | Beats right | Bars match |
|---|---|---|
| Faith | 135 → 145 | 30 → 48 |
| I'm Your Man | 278 → 297 | 52 → 91 |
| Fastlove | 286 → 309 | 51 → 89 |
| Wake Me Up Before You Go-Go | 144 → 145 | 22 → 28 |
| Amazing | 308 → 374 | 30 → 107 |
| Outside | 151 → 178 | 16 → 69 |
| Father Figure | 312 → 325 | 64 → 79 |
| Freedom! '90 | 237 → 280 | 53 → 86 |
| Jesus to a Child | 438 → 455 | 96 → 114 |
| A Different Corner | 254 → 268 | 44 → 56 |
| Too Funky | 63 → 63 | 25 → 32 |
| Everything She Wants | 181 → 197 | 28 → 57 |
| Club Tropicana | 190 → 194 | 37 → 51 |
| Careless Whisper | 288 → 284 | 73 → 83 |
| I Can't Make You Love Me | 202 → 201 | 33 → 37 |
| Roxanne | 105 → 104 | 21 → 23 |
| Kissing a Fool | 210 → 211 | 33 → 34 |
| Last Christmas | 282 → 290 | 40 → 55 |
| **All 18** | **4064 → 4320** | **748 → 1139** |

What the kept rule could hide: only 9 of the 1979 lined-up hand-chart bars have a chord that starts on beat 2 or sounds on beat 4 alone (6 and 3).

## Freedom! '90 validation, rerun (2026-11-04)
Same commands and inputs as in `add-any-song.md` (`add-song.mjs`, output to the scratchpad, not shipped), and the same compare.py.

| Route | Before: match hand chart | After: match hand chart | Unsure before → after | Trusted bars that match, before → after | Parts before → after |
|---|---|---|---|---|---|
| Hand chart with bar lines | 144/144 | 144/144 | 0 → 0 | 144/144 → 144/144 | 8 → 8 |
| Same chart, bar lines taken out | 86/144 | **122/144** | 125 → 91 (51 with two readings, 35 with one Chart reading, per part entry) | 16/19 → **49/53** | 14 → 13 |
| Recording only | 53/144 | **86/144** | 144 → 144 | — | 36 → 17 |

- Key and tempo are unchanged (C, 92).
- The planted wrong bar (Chorus bar 2 `Am` for `Bb`, in the chart with bar lines) still comes out as the one Unsure bar: Chart `Am`, Record `Bb/A Bb . .`.
- The 4 trusted bars that are wrong (23, 30, 63, 70) are all the kind already known: a held `C` where the hand chart has `F/C C`. The record hears the C pedal and the chart names F/C as one of its chords. Before there were 3 such bars (23, 59, 70).
- Recording only: every bar is still Unsure, as it must be. It has fewer parts because more 4-bar lines now repeat exactly.

## Fix wave after the independent review (2026-11-14)
`rework` (80a4899, 5.0.0) merged in first (57b35c6). Each claim was reproduced with a failing test before its fix; a builder and a reviewer per group.

| # | Claim | Verdict | Fix (commit) |
|---|---|---|---|
| 4 | `settle_edges` has no confidence floor | confirmed | the two inner beats must be at or above `MIN_CONFIDENCE` (7d164d6) |
| 1 | a bar the record contradicts on every beat ships as Chart | confirmed (`C | D E F# A | G` gave `C` trusted) | a bar needs a non-passing record chord agreeing with the chart's; passing readings alone confirm nothing (7d164d6) |
| 2 | a record change with no chart partner is confirmed by the chord held over | confirmed (`Am F C G` once, played 3x: bars 0 and 4 trusted) | such a bar is never Chart; when its reading equals the held chord it is Unsure with the record's reading alone (7d164d6, docs f8a908e) |
| 3 | words reach the song file through part names, inline names, `Key:` | confirmed | known part words (+ number) only, else `Part`; Key and Time validated; Order names without a part word counted, never kept (f07f237) |
| 5 | repeat counts dropped, name clashes lose chords, word-only header flips the route, late Order ignored, `Time:` unchecked | all confirmed; review found 5 more gaps (colon headers, marks-only lines, Unicode dashes, replay compare, unbounded counts), all fixed | f07f237 |
| 6 | given bpm ignored by the bars; fold edge mismatch; 3/8 counts; compound meters | bpm and fold edge confirmed; **3/8 refuted on the Python side** (already 3 beats), confirmed in `export-charts.mjs` (gave 1) | bars fold toward a given bpm (20-400), one `fold_ratio`, 6/8 9/8 12/8 refused without a barred chart, 3/8 = 3 everywhere (d537821, 9a2368d) |
| 7 | added-file checks too loose; skipped files silent; export crash; title match | confirmed | `addedSongProblem`; release check and a test name skipped files; `exportAll` skips bad files; `sameTitle` ignores case, spacing, apostrophes (9a2368d) |
| 8 | merge test never merged; words fallback labelled Chart | confirmed | the test now runs the merge with a control; the fallback is `chordsFrom: Record` (9a2368d) |
| 9 | errors outside the guard; cache ignores a replaced recording | confirmed (plus: a replaced file also reused old BTC chords) | guard covers settings and JSON; caches stamp size + mtime, own temporary file, best-effort writes; a tracker with no tempo uses its beats' spacing (d537821) |
| 10 | slow tests time out under load | confirmed by the brief, not reproduced idle | 20 s on chord-finder, add-song overwrite and export tests (9a2368d) |

### Re-measured with the confidence floor (18 lined-up songs)
| Rule | Bar starts | Beats right | Bars match |
|---|---|---|---|
| no settling | 1046/1979 | 4064 | 748/1979 |
| settle_edges, first version (521c636) | 1046/1979 | 4320 | 1139/1979 |
| **settle_edges with the floor (now)** | **1046/1979** | **4331** | **1067/1979** |

The floor reads 11 more beats right and 72 fewer bars matching: a bar whose inner beats are unsure keeps its edge chord as read.

### Words route on the 18 songs (new measure: each hand chart with its bar lines taken out)
| Rule | Every line written: agree / trusted right | Repeats written once: agree / trusted right |
|---|---|---|
| before items 1-2 | 1341/2157; 755 of 875 (86.3%) | 1096/2157; 638 of 776 (82.2%) |
| **items 1-2 (now)** | 1341/2157; **751 of 844 (89.0%)** | 1096/2157; **607 of 702 (86.5%)** |

Recognising a line the chart writes once and the record plays again was not built: those bars stay Unsure. Explicit counts (`x2`, `(x4)`, `Chorus x2:`) are played out by the importer.

### Freedom! '90 validation, rerun after the fix wave
| Route | 2026-11-04 before | after 521c636 | now | Trusted bars right (before / 521c636 / now) |
|---|---|---|---|---|
| Hand chart with bar lines | 144/144 | 144/144 | 144/144 | 144/144 throughout |
| Same chart, bar lines taken out | 86/144 | 122/144 | **116/144** (98 Unsure, 13 parts) | 16/19 / 49/53 / **43/46** |
| Recording only | 53/144 | 86/144 | **87/144** (144 Unsure, 22 parts) | — |

- The planted wrong bar (Chorus bar 2 `Am` for `Bb`) is still the one Unsure bar: Chart `Am`, Record `Bb/A Bb . .`.
- The 3 trusted bars that are wrong (23, 30, 70) are the known kind: a held `C` where the hand chart has `F/C C`.
- Measure scripts and validation inputs: the session scratchpad and a copy in the shared notes folder (`late-bars-measure/`), not committed (local paths).

## Decisions
- **Kept `settle_edges` in `skeleton.py`.** In a bar of 4 or more beats, a first beat whose chord differs from beats 2 and 3, which agree, takes their chord; the same goes for a last beat and the two before it. It runs on the record's bars before they are written, so both the words route and the record-only route get it.
- **The settled beat keeps the lower of the two confidences.** It is never surer than either beat, so the words route's trust test (every beat at or above `MIN_CONFIDENCE`) cannot pass on a beat that was weak. A bar can still become one chord and so trusted when all its beats were confident. That is how trusted bars go from 19 to 53. Of the 53, 49 match the hand chart.
- **Silence is neither filled nor filling.** A rest is real: an `N` edge stays, and an `N` inner beat settles nothing.
- **Bars of fewer than 4 beats are left alone.** In 3/4, beats 2 and 3 are the rest of the bar, so a real 1 + 2 split would be erased. Nothing in 3/4 was measured.
- **Dropped the BTC lag shift.** It adds a search and a range for +7 beats and −8 bars on top of the kept rule. That is not worth a new moving part.
- **Bar starts unchanged.** No rule beat the chroma-change phase rule, and the kept rule does not touch the phase.
- **Stage 5 (charts with bar lines) is untouched.** `check.py` and `reading.bar_beats` are unchanged, so `recording-check.json` and the barred route give the same results.

## Progress
- 2026-11-14: fix wave above (10 items; 9 confirmed in full, item 6's Python 3/8 part refuted). Python 206 tests OK; app: 1234 vitest tests, tsc, build OK; release check 360 pages, 0 problems.
- 2026-11-04: measured the baseline: 4064 beats right, the same as Task 7's "never move". Tried BTC lag shifts, narrower windows, phase alternatives and 8 edge rules. Kept the edge rule with tests (`test_skeleton.py`: 9 new) and a README line; a reviewer found no bugs (its two suggested tests added). Python: 182 tests OK; app: 1193 vitest tests, tsc, build OK; release check 360 pages, 0 problems. Freedom! '90 rerun as above.

## Open questions
None blocking.

## What's left
- A line the chart writes once and the record plays again stays Unsure (no repeat recognition).
- Outside's bar phase (one beat early) and I Can't Make You Love Me's half-tempo bars are still wrong. Fixing them needs a different kind of evidence than chroma change (for example drums), not a re-weighting.
- The half-beat-off songs (Fastlove, Amazing): stage 5's starts sit between tracker beats, so a record bar start can never land there. 8613fa4 settled that the grid stays.
