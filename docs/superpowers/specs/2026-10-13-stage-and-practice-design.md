# Two screens, Stage and Practice: design

Date: 2026-10-13. Status: the user picked layout B from three mockups, then approved the two-screen mockup "Stage and Practice" (https://claude.ai/artifact/5xpzaqRDMk7GRGVPQ9vDFP) with "1 yes, 2 yes, 3 yes, 4 yes". Waiting for the user to review this spec. Nothing in the app has changed yet.

## The problem, in the user's words

After the colour-band charts (3.64), the user said the chords look "much better but app ui itself is not touched". Then:

- "defiently yes, to much clutter and buttons in wrong locations"
- "some of the buttons are on the top some in hamburger its just random"
- "i imagine all songs could fit on tablet screen"
- "never tempo i dont find it usefull", but the tempo itself "its good to know"
- What they use: setlists, the song list, next and previous song, the Chord Finder, the chord selector (tap a chord for its shapes).
- Stage "will just have the most important details". Practice "will have chords selector, finder, sound generator song details and info from book". "these are completly different needs".
- "setlist on stage is important what if we decide to change or skip a song and play other song? no way for me to choose it from other setlist?"

Measured on 3.65.0 in Chrome at the iPad Air's size, Stage mode: 4 of 21 songs fit on one screen upright, 1 of 21 on its side. The top bar wraps onto two rows upright. Ten buttons sit in the top bar, nine more in the ⋮ menu, and which is where follows no rule.

## Rulings already made (not reopened here)

1. **iPad first**: an 11-inch iPad Air, 820 × 1180 points. The phone gets its own design later.
2. **Layout B**: one bar, at the bottom. The top bar goes.
3. **Stage and Practice are two different screens** with different jobs. Never one screen with things hidden.
4. **Every song fits on one Stage screen**, upright and on its side. 4 bars a row upright, 8 on its side. **No chord under 20 px.**
5. **No tap tempo.** The BPM is shown as text.
6. **Notes are hidden on Stage**, one tap to show.
7. **One letter beside each part** on its side is enough.
8. **Setlists work on Stage**: go to any song in the set, skip, or play a song from another list mid-gig.
9. Round 4, all yes:
   1. A crowded bar puts its chords on **two lines, only where needed**, on both screens.
   2. After a song from another list, **Next goes back to the song you left**.
   3. **No list editing on Stage**: lists are only picked there. Lists are edited on Practice.
   4. **Only Stage has to fit.** Practice may scroll.

## Part 1: The rule for buttons

One sentence: **the bottom bar's left side gets you around and is the same on both screens; its right side holds this screen's tools and ends with the button to the other screen; the song's own settings sit on the song (Practice only); the app's settings are in More.**

- **The bottom bar** is 64 px tall and the only bar. Left to right:
  - **Setlists**, then **Songs n/len** (your place in the set being played).
  - **Previous**: "Previous" over the title and key of the song before ("Start of set" at the first song).
  - **Next**, highlighted: "Next" over the next song's title and key ("End of set" at the last). After a song from another list it reads **"Back to the set"** in yellow, over the title and key of the song you left.
  - Stage then has **Notes** and **Practice**.
  - Practice then has **Finder**, **More** and **Stage**.
- **Sheets** open above the bar: Setlists, Songs, Notes, Finder, More. One at a time. The bar stays in view. Tapping the same button again, or anywhere outside the sheet, closes it. Picking a song closes it.
- Nothing about a single song is in More except "Back to the original chart". Key, capo, guitar, move chords and edit are on the Practice screen next to the song.

## Part 2: The Stage screen

Only what you need while you play.

- **Header, upright, two rows:**
  - Row 1: the title, then (only after a song from another list) a yellow tag **"Extra · from <list name>"**, then the facts: **Key**, **BPM** as text, the **time signature**, the **GX-10 sound** with its memory (e.g. "U01-1 FUNK", plus "→ LEAD solo" when the song has a solo sound), **Capo N** only when the song has a capo, the orange **LOWER KEY** tag when the band plays it lower.
  - Row 2: the song order as **coloured letters** with ×N.
  - Under them, the **cue** in yellow, only for the songs that have one.
- **Header, on its side:** the same things on **one row** (title, tag, facts, letters), then the cue.
- **The chart:** 4 columns upright, 8 on its side. Beside each part: the letter and the part's name upright (a 116 px gutter); the letter only on its side (a 44 px gutter).
- **Nothing on the chart reacts to a tap.** A stray touch changes nothing. (Swipe left and right still change song, as today.)
- **Not on Stage:** the chord-shapes strip, the Finder, the setup buttons, the notes paragraph (Notes opens them in a sheet), editing.

## Part 3: The Practice screen

For home and rehearsal: the chord selector, the Finder, the sound, the song's details and the book.

- **Header:**
  - The title, the artist, the "Extra" tag when it applies, and a **"Songbook no. N"** badge for the 17 songs in the George Michael Complete songbook.
  - **The setup row:** `− Key X +` (tapping the key does what today's middle transpose button does; the key shows in orange when it is moved from the original, as the number does today), **Capo N ▼** (opens today's capo picker), **Electric ▼** (electric or acoustic, as today's guitar button), **Move chords ▼** (opens today's Move chords sheet), **Edit**.
  - **The facts row:** BPM, time signature, the GX-10 sound, LOWER KEY.
  - The song order as **named chips**: letter, the part's full name, ×N.
  - Upright these are four rows; on its side, two rows (title, badge and setup row; then the facts and the chips).
- **The chart:** 4 columns both ways, the letter and name beside each part. Chords that have shapes show a dotted underline and are **buttons**: tapping one picks it (it turns yellow) and the panel shows its shapes. Tapping it again un-picks it.
- **The panel:** under the chart upright (430 px tall), beside it on its side (420 px wide).
  - With nothing picked: **"Shapes in this song"**, one tile per chord. A tile shows the chord name, its diagram, the fret text, where the shape comes from (Songbook, Electric, Acoustic, the player's own), and **▶ Play** (a strum, today's sound).
  - With a chord picked: **"Shapes for X · N of them"** with an **All shapes** button to go back. The shape used in this song is marked "In this song". Tapping a tile makes it this song's shape, as today's shape picker does.
  - **"From the book and the notes"**: Songbook (George Michael Complete, no. N, or "Not in the songbook"), Shapes (where they come from), Key (with "the band plays it lower" and the capo), Cue, then the song's full notes.
- **Editing:** Edit turns into **Done**, with **Reset** and the save status beside it, in the setup row. While editing, today's chord keyboard takes the panel's place. Nothing else about editing changes.
- **Keyboard instrument:** no Capo, Electric or Move chords in the setup row (a "Keyboard" badge instead), no GX-10 sound, and the panel shows only "From the book and the notes", as the keyboard view does today.

## Part 4: Sheets

- **Songs**: the set being played, numbered, with each song's key. The current song is marked. After a song from another list, the song you left is tagged **"you left here"**. Tapping a song goes there. On Practice the sheet also has **Edit list**, which opens today's setlist editor. On Stage it says "Tap a song to go there" instead.
- **Setlists**: every list on the left; the one being played is tagged **PLAYING NOW**. The right side shows the songs of the list you tap on the left.
  - The list being played: its songs, as in the Songs sheet.
  - Another list: **"Play this whole list"** switches the set (at a break). Tapping one of its songs plays it **as an extra**, and the sheet says so: "Tap a song to play it as an extra. Next then reads Back to the set and takes you to <song you left>."
  - On Practice, the list being played also offers **Edit list**. On Stage there is no editing of any kind (no new list, rename, delete, add, remove or reorder).
- **Notes** (Stage only): the song's notes, or "No notes for this song."
- **Finder** (Practice only): today's Chord Finder, unchanged inside.
- **More** (Practice only), in three groups:
  - This song: **Back to the original chart**.
  - How charts look: **Instrument**, **Simplify chords**, **Guitar per song**, **Light theme**.
  - Setlists and backups: **Restore the GM Tribute order**, **Export a backup**, **Import a backup**, **Restore a backup…**, **Back to all the original charts**. Then the version line, as at the foot of today's menu.

## Part 5: Moving through the set

- **Each list remembers its place.** Switching lists ("Play this whole list", or Setlists → a list) opens that list where you last were in it, not at song 1. A list never played opens at song 1.
- **An extra** is a song played from another list without leaving the set. While it shows:
  - the header shows "Extra · from <list>" on both screens;
  - **Next**, the pedal's next and a swipe to the next song all go **back to the song you left**;
  - **Previous** goes to the song before the one you left;
  - Songs n/len still shows the song you left;
  - playing a second extra keeps the same song to go back to;
  - picking any song from Songs or from the list being played, or "Play this whole list", ends the extra.
- **The extra is not saved.** If the app is closed during an extra, it opens on the song you left.
- **The pedal** keeps today's rule: page the chart if it scrolls, otherwise change song. On Stage the chart always fits, so the pedal changes song.

## Part 6: Fitting the chart

- **Stage must fit; Practice may scroll.** Both screens use the same rule; only the space differs.
- **The size:** the chart's chord size is the largest at which the whole chart fits its space, from **20 px up to 44 px upright and 36 px on its side**, found by halving (8 steps, rounded down to 0.5 px). On Stage the space is between the header and the bar (less the "Next up" line when it shows). On Practice it is the chart's side of the screen, beside or above the panel.
- **Two lines only where needed:** a bar with two or more chords that would go under 20 px at the chosen size sets its chords on two lines inside the bar. A bar with one chord, or one that already fits, stays on one line.
- After that, a chord still too wide for its bar shrinks in that bar alone, as since 3.64.1.
- **If a song cannot fit at 20 px, it stays at 20 px and scrolls.** On Stage no song does today (measured, below), but an edited chart might. On Practice 8 songs upright and 5 on its side do.
- This replaces today's band sizes (BAND_BASE 32, BAND_MIN 28, BAND_MAX 45) on both screens.

## Part 7: What goes

- The **top bar**, all of it. Every button in it moves to the bar, a sheet or the Practice header, as above.
- **Tap tempo**, and the click inside it.
- The **"Hide/Show Chord Diagrams"** menu entry and the strip's hide handle: Stage has no shapes and Practice always shows them in the panel. The saved settings for them are simply no longer read.
- The **chord-shapes strip** under the chart, replaced by the Practice panel.

## Part 8: What is added beyond the mock

The mock left these out; I propose them so nothing used today is lost. The user can strike any of them.

1. **Restore a backup…** and the **version line** stay in More (they are in today's menu).
2. **Reset** and the **save status** sit beside Done while editing (they are in today's top bar).
3. The **keyboard instrument** keeps its rules (no shapes, no capo, no sound) on both screens.
4. **Swipe** still changes song on both screens, as today.
5. The **"Next up" line** stays on Stage: one line above the bar, only when the next song has a cue (as today), cut with "…" if long. The fit counts it. It was not in the mock, so the 21-song measurement is redone with it.
6. The **EDITED · back to original** pill stays after the title on Practice when the chart is your own, and the Songs sheet keeps its EDITED chips, as today.
7. The **phone**, until its own design: below 600 px wide, Previous and Next drop the song titles so the bar fits. Nothing else is designed for the phone here.

## Part 9: How it maps onto the app

- **One screen value:** the saved view mode keeps its two values, `'normal'` (now shown as Practice) and `'stage'`, so nothing saved changes.
- **A new store module for moving through sets** (`src/store/set-navigation.ts`), built like `view-settings.ts` and spread into the store: next, previous, go to a song, play an extra, back to the set, play a whole list, and each list's place. `use-store.ts` is at 795 lines and cannot take it.
- **One way to get the song on screen**: a single selector for the shown song (the extra if there is one, otherwise the set's song at your place). Today five components pick `setlistSongs[currentIndex]` themselves (SongSheet, DiagramsBar, TopBar, TapTempo, SetlistScreen); they all use the selector, so an extra shows everywhere at once.
- **Places per list** are saved under a new setting, a map from list id to place. Today's single saved place is read once, on the first start after the update, into the map.
- **The songbook number** is a new optional field on the song, `songbook?: number`, filled in `src/data/songs.ts` for the 17 book songs (Careless Whisper 4, A Different Corner 8, Everything She Wants 11, Faith 12, Fastlove 13, Father Figure 15, Freedom '90 19, I Can't Make You Love Me 25, I'm Your Man 31, Jesus to a Child 35, Killer/Papa Was a Rolling Stone 36, Kissing a Fool 37, Outside 47, Roxanne 49, Somebody to Love 52, Too Funky 61, Waiting (Reprise) 63). An edited copy of a chart shows the built-in song's number.
- **New components**, each in its own file, none over 800 lines: the bottom bar (replacing today's), the Stage header, the Practice header with its setup row, the Practice panel, and one file per sheet. Today's capo picker, Move chords sheet, Chord Finder, setlist editor, restore and saved-charts dialogs are reused as they are.
- `TopBar.tsx`, `TapTempo.tsx` and today's `DiagramsBar.tsx` strip are removed once nothing uses them. The shape-choosing logic inside `DiagramsBar.tsx` moves into the Practice panel.

## Part 10: Testing

- **Store tests (Vitest):** play an extra, Next goes back to the song you left, Previous goes to the song before it, picking a song ends the extra, the extra is not saved, each list's place is restored on switching, today's saved place is carried over.
- **Component tests:** the bar's buttons on each screen and their order; Next reads "Back to the set" during an extra; no editing controls on Stage (Songs and Setlists sheets); chord taps do nothing on Stage and pick a chord on Practice.
- **Fit tests** with fake measurements, like today's `use-fit-text` tests: the halving search, the two-line rule only for bars that need it, the 20 px floor, the scroll when a song cannot fit.
- **Measured on the built app** in headless Chrome: all 21 songs on Stage, upright and on its side, report the chord size and any bar under 20 px.
- **The user's own check on the iPad** in Safari, before the gig.

## What was measured

In the mockup, in Chrome, at 820 × 1180 and 1180 × 820, with the real 21 charts:

- **Stage, two lines only where needed:** 21 of 21 songs fit upright and 21 of 21 on its side, no chord under 20 px. The smallest song size is 28 px upright and 22 px on its side (Somebody to Love).
- **Practice**, with the panel: 13 of 21 fit upright and 16 of 21 on its side, so it scrolls for the rest, as agreed.
- **Not measured:** iPad Safari. Safari's address bar takes about 50 px when the app is opened in the browser rather than from the home screen; in the earlier layout test, layout B still fitted 21 of 21 with it.

## Delivery

- Built on a branch and merged to main only when the tests, the type check and the build pass and the 21-song measurement is clean, because main goes straight to the iPad.
- Released as **4.0.0**: the screens change for everyone who opens the app.
- One plan, in this order: the store module, then the bottom bar and sheets, then Stage, then Practice, then removing the top bar, then the fit rule, then the measurement.

## Not in this design

- The phone's own design (only the minimum in Part 8, item 7).
- Changes to the chart's colours, letters or bands (the 3.64 design stands).
- Changes inside the Chord Finder, the setlist editor or the chord keyboard.
- Syncing between devices (paused, as before).
