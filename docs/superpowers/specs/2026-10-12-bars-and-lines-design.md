# Bars and lines you write: design

Date: 2026-10-12. Status: agreed in chat, part by part. Waiting for the user to review this spec.

## The problem, in the user's words and choices

Asked "What hasn't stayed the way you meant it?", the user ticked all four answers:

1. **Lines move by themselves.** The app stores a section as one run of chords and guesses the lines from repeated parts (`layOutParts`, 3.55.0 and 3.56.0). An edit can re-flow the lines. A section can't be held on lines the player chooses when the guess splits it differently.
2. **Edits gone or different.** On the iPad, Safari and the home-screen app keep separate saved charts. This is a separate problem, designed next, and is **not in this spec**.
3. **Typing is slow or fiddly.** Tapping between chords and hunting for symbols on the iPad keyboard both slow the player down.
4. **No bars or rhythm.** Nothing shows how long a chord lasts, so the player loses their place in long chords.

## What the standard tools do

- **ChordPro grids** (used by OnSong, SongbookPro and MobileSheets) write a chord chart as bars: `| Am . . | C . . |`. `|` is a bar line, `.` is a beat, and every line shows exactly as written (chordpro.org, directives-env_grid).
- **iReal Pro** uses a fixed grid of 16 cells per line, 4 bars by default, so 4- and 8-bar parts start at the left edge without any guessing (irealpro.com, chart layout).

Both make the bars and lines explicit, and neither guesses. This design does the same. The app already accepts `|` as a token (`isChordToken`), and a key change (`transposeText`) already passes `|` and `%` through untouched. No built-in chart uses bars yet.

## Part 1: How a chart is written and shown

- A section's `chords` stays plain text: two spaces between tokens, `\n` between lines.
  - New tokens: `|` is a bar line, and `%` repeats the bar before it. `N.C.` and `(x2)` work as now.
  - `| C  G/B |` is two chords sharing one bar.
  - A line has bars when it contains `|`. Chords before the first `|` or after the last `|` form a bar of their own, so `Cadd9 | Em11` is two bars.
- Every line on the chart is a line that is written in the text (the only exception is the fallback in part 4). Built-in songs keep the one-part-per-line look because their lines are written into `songs.ts`, not guessed.
- **Showing bars.** A line with bars is drawn as a row of bar boxes, all the same width within a section, so bar 1 of every line sits in the same column.
  - Bar lines are thin and in the muted colour. Chord names stay the largest text.
  - A box with two or more chords splits its width evenly.
  - `%` is drawn as the % sign, centred in its box.
- A section without bars is shown exactly as typed, one written line per chart line, with the hanging indent on wrap (3.56.0).
- **Trade-off.** Equal-width boxes take more room than packed chords. Measure the fitted chart font for all 21 songs before and after, on iPad landscape and portrait, and report the numbers.

## Part 2: Editing

- **What the editor shows is what is saved.** On the first edit of a section, its lines are saved exactly as shown.
  - The 3.56.0 behaviour goes: `keptLines`, which saved auto lines as one line, and `relayOut`, which re-flowed lines after an edit.
  - Undo still restores whole snapshots, so Undo back to the original still drops the edit (`sameSections` sees the built-in text again).
- **Type mode is the fast way in.** Each section keeps its own text box. A row of one-tap keys sits above the keyboard: `|`, `%`, `↵ Line` and the song's chords.
  - A key goes in at the text cursor with the two-space spacing done for it.
  - With a hardware keyboard the player just types.
  - Chords the app doesn't know are still flagged.
- **Tap editor.** The chord keyboard gets `Bar |` and `%` keys beside `↵ Line`. A bar line can be selected and deleted like a chord.
- **Paste.** A ChordPro grid line such as `| C . . . | G . . . |` pastes as bars: the `.` beat tokens are dropped and the `|` are kept.

## Part 3: Bars for the built-in songs

- **Sources:**
  - The 17 book songs come from the user's scans, chord symbols only, never lyrics. The scans are in `~/.claude/uploads/6553db95-d958-4c19-af19-970e6ee6a50d/`.
  - Club Tropicana comes from the NoTreble bass transcription.
  - Amazing, Wake Me Up Before You Go-Go and Last Christmas come from bar-accurate published charts: Hooktheory and Songsterr.
- **Check every song** by comparing its total bar count with the recording: duration × BPM ÷ beats per bar, allowing for repeats and the song order row.
- **The band's version wins.** The chart keeps the band's key, its chords and the player's own shapes (`Song.playerShapes`). The book supplies only how many bars each chord gets.
- **Batches of about four songs per release:** I Can't Make You Love Me first, then setlist order. Each batch comes with a short note per song: what changed, and anything the source leaves unclear for the user to settle at rehearsal.
- **Saved copies.** A song the user has already edited on a device keeps that saved copy, as today. It shows the new bars only after "back to original" for that song. Each batch note says this.

## Part 4: Safety, testing and release order

- **The guess stays only as a fallback.**
  - `layOutParts` is used only for a section written as one unbroken line with no bars. That covers built-in songs still waiting for their batch, and the user's older saved charts.
  - It never touches a section that has its own lines or bars.
  - Because the editor saves exactly what it shows, the guess ends for a section as soon as it is edited.
- **No data conversion.** Saved charts and earlier versions are left as they are, so no restore point is needed.
- **Tests:**
  - Bars, `%` and pasted dots parse correctly.
  - Transposing and simplifying keep every `|` and `%`.
  - Bar boxes in a section share one width, so the columns line up.
  - The editor saves exactly the lines it shows.
  - Undo returns to the built-in chart.
  - Every built-in song has no unknown tokens.
  - Each barred song has a pinned bar count.
  - The chart-integrity tests still pass.
  - Bar tokens never become chord diagrams: `songChordsOf` and the diagrams bar skip `|` and `%`.
- **Checks in the preview** at iPad and phone sizes, plus the font measurements from part 1.
- **Release order:**
  - 3.57.0 brings the format, the chart display and the editor, with no changes to `songs.ts`.
  - From 3.58.0, the song batches follow.
  - Each release is pushed after tests and build, and its version is confirmed in the live bundle.

## Where the code goes

All code files stay at 800 lines or fewer. `layout.css` is over the cap, so new styles go in their own files.

- `app/src/music/bars.ts` (new): a written line to bars (`string[][]`, the chords in each bar), whether a line has bars, and pasted-dot clean-up. `chord-text.ts` keeps parsing and formatting.
- `app/src/music/phrases.ts`: `layOutParts` skips text containing `|`. `keptLines`, `relayOut` and `isLaidOutByParts` are removed.
- `app/src/components/song/BarRow.tsx` (new): one line of bars as equal boxes. `SongSheet.renderChords` uses it for lines with bars.
- `app/src/styles/bars.css` (new): imported from `global.css`.
- `app/src/components/edit/ChartEditor.tsx`: save lines as shown, draw bar-line tokens, and wire in the new keys.
- `app/src/components/edit/ChordKeyboard.tsx`: `Bar |` and `%` keys.
- `app/src/components/edit/TypeKeys.tsx` (new): the one-tap key row for Type mode.
- `app/src/music/chart-view.ts`: `songChordsOf` skips `|` and `%`.
- `app/src/data/songs.ts`: bars and lines per song, in batches. At 574 lines it is close to the cap, so if the bars push it past 800, split the song data by song into `src/data/songs/`.

## Not in this spec

- Edits on Safari, the home-screen app and the phone showing the same saved charts (sync). This is the next design.
- Beats inside a bar (`.` placeholders shown on the chart), time-signature changes within a section, and repeat signs or endings drawn as notation. Repeats stay `(x2)` and the song order row.
