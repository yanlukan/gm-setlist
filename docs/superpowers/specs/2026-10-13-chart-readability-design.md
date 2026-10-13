# A chart you can find your place in: design

Date: 2026-10-13. Status: the user chose the base design ("Colour bands + letters") from four mockups shown as pictures. Waiting for the user to review this spec. Nothing in the app has changed yet.

## The problem, in the user's words and choices

At a rehearsal the user lost their place in Kissing a Fool on the iPad, in portrait, and the band did not play it well. Their words:

- "it was impossible for me to figure out what's going on"
- "Lost my place, It was hard to follow the song. Other songs are also hard to follow. But since I know them I could play from memory but if I look somewhere else and back then it's lost"
- Problems ticked: **"Bars don't line up"**, **"Parts look alike"**, **"Parts run together"**
- "the app is hard to read. It started as notepad for quick chords write down but George Michael songs are more complicated and we need rework"

Rulings already made (not reopened here):

1. **Rework the chart itself.** Not a tempo or scrolling gadget.
2. **No "you are here" marker** of any kind: nothing follows the song, nothing is tapped to mark the bar, no auto-scroll. The player re-finds the place from the chart's own structure.
3. **Bars a row: 8 in landscape, 4 in portrait, 2 on a phone.** The user corrected my proposed 4 in landscape to 8.
4. **Approved design before any code.** Four mockups were drawn and judged; the user picked Colour bands with the lettered headers taken from the Lead sheet design. This spec writes that choice down.

Why the chart fails today, measured: each section is its own grid, as wide as its longest line, so bar widths differ by section (98 to 168 px within one song) and bar lines never line up down the page. Section labels are 0.28 of the chord size with an 11 px floor, and the form pills 0.38 with a 14 px floor; at a long chart's fitted sizes both sit on their floors, so the player sees 11 px labels and 14 px pills. The chord font is fitted to the screen and lands at 22 to 39 px in portrait. The shapes strip and the bottom bar take a third of the portrait screen.

## What the standard tools do

- **iReal Pro**: equal cells, 4 bars a line, a section starts behind a double bar line with a boxed rehearsal letter, short sections are padded to a full line.
- **Real Book and big-band charts**: rehearsal letters A, B, C and a double bar at every section start. Players call out "from D".
- **Soundslice**: a power-of-two number of bars per line so phrases line up.
- **OnSong**: section highlight styles, a coloured band behind each part.

This design uses all four ideas. Nothing here is new to a chart reader.

## Part 1: One grid for the whole song

- The chart has **one column count for the whole song**, set by the screen, not by the sections. Every bar cell is the same width (`minmax(0, 1fr)`), so bar lines line up from the first band to the last.
- Columns: **4 in portrait**, **8 in landscape**, **2 on a phone**. Two CSS media queries decide it, and nothing else:
  - landscape: `(orientation: landscape) and (min-width: 900px)`
  - phone: `(max-width: 500px)` (the breakpoint the bottom bar already uses)
  - everything else is portrait. A 12.9-inch iPad Pro held upright is 1024 px wide and still gets 4 bars.
- **Written lines are kept.** A written line is one line of a section as the author typed it (the editor saves lines as shown). Every written line starts at a **four-bar boundary**: column 1 in portrait, column 1 or 5 in landscape, a two-bar boundary on a phone. A line shorter than four bars is **padded with empty cells to the next multiple of four bars** (two on a phone). Empty cells are blank, with no bar lines, so the bars that are there stay the same width as every other bar. This is what the mockup did.
  - Portrait: every written line is one row of four. A 1-bar line (the `| Eb6 |` that ends Last verse) is one bar and three blank cells.
  - Landscape: **two 4-bar lines share one row of eight.** A 1-bar line followed by a 4-bar line is one bar, three blank cells and then the four bars, all on one row.
  - A line longer than four bars pads to the next multiple of four as well. The one 5-bar line in the 21 songs (Somebody to Love's Break, the first line of its band) pads to eight: in portrait it is a row of four and then a row of one bar and three blank cells; in landscape it is one row of eight.
  - A section with no lines is a header alone (none exists in the set).
  - Phone: a 4-bar line is two rows of two.
  - The padding is pure CSS, so the bars component never knows which screen it is on: after every written line it writes enough blank cells to reach the next multiple of four. The first of them, as many as reach the next multiple of two, are marked for every screen (`pad-both`); the rest are marked for four- and eight-bar rows only (`pad-wide`), and the phone query hides those. So a 1-bar line is followed by three blanks (one for every screen, two wide), a 2-bar line by two (both wide), a 3-bar line by one (for every screen).
  - What the two queries mean on real devices: a full-screen iPad on its side gets 8 bars. An iPad in Split View narrower than 900 px, and a phone on its side (844 × 390), get 4 bars at the portrait sizes. A phone held upright gets 2.
- `%` stays a centred, muted repeat sign in its own cell. `N.C.` stays a mark. A line's `(xN)` sits inside the line's **last bar** as its last item, pushed to the right edge; when that bar stacks (Part 4) it ends the bottom row. It never gets a cell of its own. Blank padding cells have no content and no bar lines; the band's tint runs under them.
- A written line **without** bar lines (no `|` and no `%`, the parser's `hasBars` test) inside a song that has bars elsewhere is drawn as one text row across all columns, left-aligned, in the one-chord size, with today's hang indent when it wraps (the `.chart-line` rule). One such row per written line, including the lines the parts layout makes out of a one-line section. No song in the set has one today.
- A song with **no bar lines anywhere** (today, Careless Whisper and any chart typed without `|`) keeps today's layout: labels in a left column, the fit-to-screen text from 20 to 64 px. The only thing that reaches those charts is the chart heading's bigger title and pills (Part 5 and Part 8).

## Part 2: Colour bands with letters

Each section is a **band**:

- A **6 px rule** down the left edge in the section colour, a **faint tint** of the same colour behind the bars (`color-mix(in srgb, <colour> 10%, transparent)`), and rounded right corners (8 px).
- A **header row** inside the band: a **boxed letter** and the **section name in full**, as written ("Bridge 2", "Last verse"), 19 px in portrait (Part 5 has the other screens), bold, in the section colour, no uppercase. A thin rule in the section colour runs from the name to the band's right edge. The header row is at least 44 px tall, so it is a comfortable tap target.
- The gap between bands is **14 px** and the gap between rows inside a band is **5 px** in portrait (Part 5 has the other screens). Parts cannot run together: a part is a shape with a coloured edge, a header and clear space around it.
- The header does what the small label does today: when the chord shapes are shown and the player is on guitar, tapping it focuses the shapes strip on that section (the `aria-pressed` button and the `is-focused` tint stay). Otherwise it is plain text. Its accessible name is the section name alone; the letter is decoration for screen readers.

**Letters.** Sections get **A, B, C, ...** in chart order, one letter each, per song, so the letters run down the page. Chart order is the order the sections are stored in and shown on the chart, top to bottom (the editor's order). It is not the song order, which repeats sections. After Z comes AA, AB, and so on; Somebody to Love has the most sections in the set, twelve, so it runs A to L. Letters are computed, never saved. Kissing a Fool: A Intro, B Verse, C Chorus, D Bridge, E Bridge 2, F Last verse, G Outro. Faith: A Intro, B Verse, C Pre-Chorus, D Chorus, E Solo, F Stop.

The letter box is **filled**: background in the section colour, the letter in the page background colour, 800 weight, 5 px corners. The letter is never smaller than the text beside it: in a band header the box is `max(0.8em, 26px)` square in portrait (26 px at the base; it grows with the chart) with a 19 px letter, and 22 px square with a 16 px letter in landscape and on a phone. In a form chip the box is 22 px square with a 16 px letter.

**Colours.** The section colour comes from the section name, as today, with two fixes:

- a name **ending in** "verse", "chorus" or "bridge" takes that type's colour, so "Last verse" turns verse blue instead of grey. "Pre-Chorus" is checked first and keeps purple.
- **"Solo"**, exactly that name, gets its own colour, new in every theme, instead of grey.

Checked against all 21 songs (147 sections), these are the sections whose colour changes, and no others: Last verse (Kissing a Fool, Club Tropicana, Waiting (Reprise)), Post-Verse (Everything She Wants), Killer verse and Killer verse 2 (Papa Was a Rolling Stone) turn verse blue; Post-Chorus (Fastlove, Outside) and Last Chorus (Jesus to a Child) turn chorus green; Solo (Faith, Somebody to Love) turns the new pink. "Bass solo" (Club Tropicana) and "Trumpet solo" (Papa) stay grey, because only the exact name "Solo" is a solo; say so if you want them pink. "Chorus end" (Somebody to Love, I Can't Make You Love Me) stays grey: it ends in "end", not "chorus". Two things to know: a Post-Chorus next to its Chorus shares the green, so the letter and the name tell them apart; and Intro and Outro share grey, as today, as the first and last band.

| Type | Dark theme | Light theme | Stage theme (Part 6) |
| --- | --- | --- | --- |
| Verse | `#4a9eff` | `#1d4ed8` | `#6ab4ff` |
| Chorus | `#4ade80` | `#15803d` | `#5ff08f` |
| Bridge | `#fb923c` | `#c2410c` | `#ffa14a` |
| Pre-Chorus | `#c084fc` | `#7e22ce` | `#d6a6ff` |
| Solo (new) | `#f472b6` | `#be185d` | `#ff8ad0` |
| Intro, Outro, other | `#888888` | `#6b7280` | `#cccccc` |

The colour fix shows wherever a section colour is used today: the chart editor's labels, the form editor, and the chord search's song view. The setlist does not use section colours. "Last verse" and "Solo" change colour in those three places too. That is intended.

## Part 3: The song-order strip

The strip of pills above the chart becomes a **legend for the bands**:

- Each chip is **filled** (tint 22 % of the section colour, 1.5 px border in the colour), rounded, with the **letter box** at the left and the **full section name**: "Verse", "Bridge 2", "Last verse". The letter is the one that section's band carries on the chart; the second "Chorus" step shows C again. Letters come from the sections, never from the form. Text 17 px, 800 weight (16 px in landscape and on a phone). A repeated step keeps its "×2" as today.
- The short labels (V, C, Br2) are gone from the chart strip. The form **editor** keeps them; nothing changes there.
- The strip still hides when the song order names a section the chart does not have (the `formMatches` rule).
- Cost: with full names, nine or more steps wrap to a second row in portrait, about 36 px. Faith's eleven steps take two rows; Somebody to Love's sixteen steps (over twelve different sections) may take three. In landscape one row holds a form of up to about nine steps (Kissing a Fool's nine fit); Faith's eleven take two rows there too, about 66 px.
- Chips are a legend, not buttons. Tapping one does nothing (jumping to a band is listed under "Not in this spec").

## Part 4: Bar lines and the chords in a bar

- Bar lines stay as today: **2 px**, in the muted text colour (`--text-muted`). Every bar has a left line, so the first bar of every row has one. The last bar of a written line has a right line. Blank padding cells have no lines. What changes is not the lines but that they line up (Part 1). The picture card said "thicker lines"; 2 px is what the mockup you chose drew and what the app draws now.
- The **first bar of a band's first line written in bars** starts with a **double bar** in place of its left line: reading left to right, a 5 px line, a 2 px gap and then a 2 px line, in the section colour. That is the heavy-light pair the Lead sheet mockup drew and the mark a Real Book uses for a new part. Nothing else on the page uses it. A band that opens with a text row has no double bar (none in the set does).
- **Landscape only:** the fifth column of an 8-bar row starts with a line in the text colour instead of the muted one, so the two 4-bar phrases that share a row read as two phrases, as the mockup drew. The bar before it drops its right line, so the lines never add up to 4 px. The same holds after a 1-bar line's blank cells, where the next written line starts in column 5.
- **Chords in a bar.** One chord sits at the left line, as today. Two chords share the bar: each takes at least the room its own symbol needs, and what is left is split equally, so when both fit in half a bar the second starts at the **midpoint**. Three chords the same way, at thirds (the judging table said quarter points; thirds, because the data has no beats). A wider symbol (`Fdim7/Eb`, `Bb7sus4`, `Db6(b5)`, `Bb7(b9)` at the portrait size) takes more than its share and moves the next chord to the right, so the second chord never sits flush against the next bar line. This is the rule the mockup used and the rule today's bars already use (`flex: 1 1 0; min-width: max-content`), so the picture you chose is what you get. The data does not record beats: **no beat ticks, no two-tier chord symbols.**
- Only when the chords together do not fit the bar at all does the bar **stack**: the chords go one under the other, each left-aligned at the bar line, and that row grows from about 46 to about 62 px (69 px in portrait). Nothing is squeezed and nothing shrinks below the sizes in Part 5. This is a plain flex-wrap; no measuring code. In the two songs drawn it happens only in landscape, in eight bars of Kissing a Fool (the Chorus and both bridges); in portrait no bar stacks.
- `N.C.` counts as a chord when it shares a bar: `F# N.C.` in Faith's Pre-Chorus is a two-chord bar, with `N.C.` at the midpoint, at the shared-bar size.
- Sizes inside a bar: a one-chord bar at the chord size; a bar with two or more chords at `max(0.85em, 24px)` of it; `%`, `N.C.` and `(xN)` at `max(0.75em, 24px)`; a trailing alteration in brackets, the `(b9)` of `Bb7(b9)` or the `(b5)` of `Db6(b5)`, at `max(0.8em, 24px)` of its chord, as the mockup drew it, so the root stays the biggest thing in the bar.

## Part 5: Sizes and fit

All chart sizes hang off one base, the chord size, set per screen in CSS. Everything else is a multiple of it with a floor, so when the base changes the chart stays in proportion and nothing ever drops under its floor.

| | Portrait (default) | Landscape | Phone |
| --- | --- | --- | --- |
| Bars a row | 4 | 8 | 2 |
| Chord size (base) | 32 px | 26 px | 24 px |
| Chord in a 2+ chord bar | `max(0.85em, 24px)` = 27 px | 24 px | 24 px |
| Fit range (below) | 28 to 45 px | 24 to 36 px | 24 to 34 px |
| Bar cell height, at least | 44 px | 44 px | 44 px |
| Band header text | `max(0.6em, 16px)` = 19 px | 16 px | 16 px |
| Letter box: band header / form chip | `max(0.8em, 26px)` / 22 px | 22 / 22 px | 22 / 22 px |
| Letter inside the box: header / chip | 19 / 16 px | 16 / 16 px | 16 / 16 px |
| Form chip text | 17 px | 16 px | 16 px |
| Band gap / row gap | 14 / 5 px | 10 / 4 px | 12 / 4 px |
| Chart side padding | 16 px | 12 px | 12 px |
| Title | `max(0.8em, 26px)` | 24 px | 22 px |
| Preset, position and "edited" pills | at least 16 px | 16 px | 16 px |

**Fit.** Today one font size is searched between 20 and 64 px for the biggest chart that needs no scrolling, and a long chart lands at 20 px. For a chart in bands the rule is below. "Fits" means the chart's scroll area needs no scrolling: the whole chart, title to notes, is shorter than the space between the top bar and the shapes strip. The chart refits whenever that space changes (the strip opening or closing, a rotation, a new song), as today.

1. Start at the base size.
2. If the whole chart fits the screen at the base, **grow** it, up to the top of the fit range, while it still fits.
3. If it does not fit at the base, **shrink** it, but no further than the bottom of the fit range, if that is enough to avoid scrolling.
4. If the whole chart still does not fit at the bottom of the range but the bands alone do (the title, cue, strip and notes are what overflow), keep the smallest size at which the bands fit, so only the notes scroll. The hook does this today.
5. If even the bands do not fit at the bottom of the range, **go back to the base size and scroll.** A long song is never shown small just because it is long.

Shrinking only helps while the chord text is taller than the cell floor or while bars are stacked; a chart of one-chord bars is the same height at 28 px as at 32 px, because every cell already sits on its 44 px floor. The bottom of the portrait range, 28 px, is under the 30 px the brief asked for; it is used only when that is what fits a chart on one screen, and on Kissing a Fool it saves nothing (see below).

The existing fit hook does steps 2, 3 and 4 already (it searches a range, and refits so only the essential part fits when the whole chart cannot); step 5 is a new "fall back to this size when nothing fits" option. The range and the base are read from the chart's own CSS variables (`--chart-base`, `--chart-min`, `--chart-max`, set on the bands chart by the three media queries in bands.css; the hook reads them with `getComputedStyle`, and a missing value falls back to the min and max passed in, as today), so the breakpoints live in one place, the stylesheet. Two of the hook's options do not apply to bands. The no-wrap search: bands pass no `preferNoWrapMin`, so `data-wrap` is never set on a bands chart and the prose no-wrap rule keeps applying to prose only. The old narrow mode, which halved the columns when a chart was too wide: it goes, with its three hook tests, because columns come from the screen now. The "cramped" flag, which shrinks the shapes strip to 70 % when a chart cannot fit, is proposed **off for band charts**, because otherwise every long song gets small shapes; it stays for prose charts. Say so if you want it kept. One more thing to know: the chart refits when the strip opens or closes, so a song can change size mid-song when you tap the strip handle; today's charts do the same.

**Honest fit numbers for the two songs drawn.** Measured on 3.64.0 in the built preview (dark theme; the light theme gives the same numbers), replacing the mockup estimates that stood here. Each cell is the chart size, then how far the chart scrolls, in px and in screens (scroll ÷ the scroll area's height + 1). "Chords" is how far the last band ends below the screen; the rest of the scroll is the notes under the chart, which the fit lets scroll (step 3). Stage is shown, with its strip closed as it starts (decision 3) and open. Off stage the chart sizes are the same, but the scroll area is up to 84 px shorter (the top bar, and Kissing a Fool's cue line), so the chart scrolls that much further.

| Song and screen | Strip closed | Strip open |
|---|---|---|
| Kissing a Fool, portrait 820 × 1180 | 32 px; scrolls 730 px, 1.71 screens; chords 588 px, 1.57 | 32 px; scrolls 900 px, 2.05 screens; chords 758 px, 1.88 |
| Faith, portrait | 42 px; scrolls 203 px, 1.20 screens; chords fit | 32 px; scrolls 261 px, 1.30 screens; chords 56 px, 1.07 |
| Kissing a Fool, landscape 1180 × 820 | 26 px; scrolls 625 px, 1.93 screens; chords 504 px, 1.75 | 26 px; scrolls 795 px, 2.59 screens; chords 674 px, 2.35 |
| Faith, landscape | 26 px; scrolls 231 px, 1.34 screens; chords 68 px, 1.10 | 26 px; scrolls 401 px, 1.80 screens; chords 238 px, 1.48 |
| Kissing a Fool, phone 390 × 844 | 24 px; scrolls 1867 px, 4.04 screens; chords 1599 px, 3.60 | 24 px; scrolls 2037 px, 5.58 screens; chords 1769 px, 4.98 |
| Faith, phone | 24 px; scrolls 1143 px, 2.86 screens; chords 728 px, 2.18 | 24 px; scrolls 1313 px, 3.95 screens; chords 898 px, 3.02 |

- Scroll areas on stage: portrait 1030 px with the strip closed and 860 px open; landscape 670 and 500; phone 615 and 445.
- Kissing a Fool, portrait, on stage with the strip closed: the whole Bridge is on the first screen, with 7 px to spare, and the fold falls at the start of Bridge 2. With the strip open the fold falls in the Bridge. Shrinking below 32 px saves nothing: every cell is on its floor.
- Faith, portrait, strip open: the chords do not fit at 28 px, so the chart stays at 32 px and its last row is 56 px below the screen. With the strip closed the chords fit and grow to 42 px; only the notes scroll.
- Every shape met its floors in both songs: chords at least 24 px, headers and chips at least 16 px, cells at least 44 px tall. Columns were 4, 8 and 2, and the bars lined up (as many left edges as columns).
- Against the mockup estimates: portrait is close (1.57 against about 1.6 screens of chords with the strip closed); landscape is longer (1.75 against about 1.5); the phone is longer (3.6 against about 3).

**Changes from the mockup pictures, on purpose.** The mockup you chose was drawn before the sizes above were settled. These are the differences, so none of them surprises you after the build:

- Header text in mixed case ("Bridge 2"), not the mockup's spaced capitals; the letter box does the signalling. Say so if you want the capitals back.
- Bar cells at least 44 px tall, not 46: the app's tap-target size.
- Three-chord bars at the same 24 px floor as two-chord bars (the mockup had a 25 px tier); `(xN)` at the 24 px floor (mockup 20 px); `%` at `max(0.75em, 24px)` (mockup full chord size); landscape headers 16 px (mockup 18); band corners 8 px (mockup 6); phone rule 6 px (mockup 5); intro grey `#888888` (mockup `#b8bcc2`); chips at 22 % tint (mockup 10 %).
- The letter is at least as big as the text beside it (Part 2); the mockup's chips had no letters at all.
- Letters run in chart order, not song order (the judging table said song order at first appearance); in all 21 songs the two orders are the same, and Papa Was a Rolling Stone, whose form does not match its sections, has only chart order.
- Three chords at thirds, not quarter points (Part 4).
- The compact chrome gains about half a row of bars in portrait, not the "roughly one more row" the picture card said (counted: 29 px).

## Part 6: The Stage theme

The Stage theme today paints verse, chorus, bridge and pre-chorus labels white on black, and intro, outro and every other section light grey (`#cccccc`). Colour bands need their colours. Proposed: **Stage keeps the section colours, in the brighter shades of the table in Part 2**, on the same black background with white chords. The tints stay at 10 %; on black they read as dark coloured stripes.

What else recolours on stage, because it shares the chorus colour variable: the position pill on the chart's title line (a plain label on stage), the recommended-position text on each tile of the song grid, the recommended-shape mark in the shapes strip, and the "from" chord in Move chords. They turn from white to the Stage chorus green of the table in Part 2 (`#5ff08f`), a shade brighter than the dark theme's. The current-song outline in the grid uses the accent colour, which no theme overrides, so it does not change. This is proposed, not yet accepted; it is decision 1 in Part 7.

The alternative is in Part 7, decision 1.

## Part 7: Decisions proposed in this spec

Each is written as the design stands. Flip any of them in your review; none needs a redesign.

1. **Stage theme keeps section colours** (Part 6). *Alternative:* Stage stays black and white. The letters, the double bars and the band shapes still tell parts apart, but every band is a grey stripe, and colour no longer does the heavy lifting the guitarist judge valued most.
2. **The one scroll in portrait is a finger scroll, as today.** Kissing a Fool needs one swipe; nothing else is added. *Alternative:* a tap on the lower half of the chart turns most of a screen forward (0.8 of it, so the last row you saw stays in view) and a tap on the upper half the same back, using the page-turn function the app already has for a page-turner pedal's or a keyboard's arrow and Page keys (you have not mentioned owning a pedal; the function exists for one). A chart that pages on tap cannot also use taps to open chord shapes in the same place, so this would move the shape tap to a long press.
3. **On stage, the chord-shapes strip starts collapsed** to its existing 28 px handle, whose label grows from 12 to 16 px, and whether it is open on stage is remembered on the device separately from the normal view (a new saved setting, default closed; the normal view's setting is untouched). This is what gives Kissing a Fool its 1.6 screens instead of 1.9 and Faith its full size. *Alternative:* as now, one shared open-or-closed state for both views.
4. **No bar numbers.** Rows are counted by the band's shape and letter. *Alternative:* 16 px muted bar numbers (5, 9, 13) at the left of every row except a band's first, in a gutter paid for by cutting the side padding from 16 to 8 px. Pick this if you count bars when you re-find your place.
5. **Two chords share a bar at the midpoint when both fit, and a wider chord takes more** (Part 4). No portrait bar stacks. *Alternative:* a strict midpoint, each chord held to exactly half the bar. Seven portrait bars (`Abm6 Bb7(b9)`, `Eb6 Db6(b5)` twice, `Bb13 Bb7(b9)`, `Eb6 Fdim7/Eb`, `Eb Cm7 C7(b9)`, `Bb7sus4 Cm7`) would then stack and Kissing a Fool would grow by about 100 px.

**Separate yes or no: the compact chrome.** Not part of the choice above, and proposed **not now**: do the chart first, use it at a rehearsal, then decide. If yes, it would be: the bottom bar's buttons 44 px tall instead of 52, with 4 px padding instead of 8 (saves 16 px); the cue line at 15 px with 4 px padding (saves about 13 px); and in landscape the cue sits on the title line after the pills when it fits on one line (saves a full row of bars there). About half a row of bars in portrait, a whole row in landscape. The top bar is shared by every screen and is not touched either way.

## Part 8: What does not change

- **Song data.** No song's sections, form, notes, key, preset, cue, transpose, shapes, lower key, capo or bpm changes. Every chord is shown exactly as saved; the chart-integrity test (every song, normal and stage) stays green.
- **The editor.** The chart editor keeps its own drawing of bars and its chord keys. The form editor keeps the short labels.
- **The chord finder, the voicing picker, Move chords, the song grid, the top bar, swiping between songs.**
- **The keyboard view** shows the same bands: it is the same chart at sounding pitch, without shapes or taps, as now.
- **Prose charts** (no bar lines anywhere) keep today's section layout and the 20 to 64 px fit. They share the chart heading with the bands, so the bigger title and pill floors in Part 5 apply to them too; that is the only change Careless Whisper sees.
- **Saved data format.** One new saved setting (decision 3) with a default; nothing to migrate. Switching the app on and off, or an old device, loses nothing.

## Part 9: Safety, testing and release

**Tests first, every step** (the project's rule: a failing test, then the code). What the tests cover:

- Letters: A to Z then AA in chart order; two songs' expected letters.
- Section colour: "Last verse" is verse, "Pre-Chorus" stays pre-chorus, "Solo" is solo, "Stop" is default.
- Bands: one band per section, in chart order, with header, letter and name; the header is a button only when shapes are shown on guitar; its accessible name is the section name.
- Grid: every written line starts a row; a 1-bar line is followed by three padding cells, the last two marked `pad-wide`; a 2-bar line by two, both `pad-wide`; a 3-bar line by one, not `pad-wide`; a 5-bar line by three; `(xN)` is inside the last bar; `%`, `N.C.` and `(xN)` keep their classes; a section without bars inside a bars song is one text row per written line, so a two-line section without bars is two rows.
- Strip: full names, letters that match the bands, "×2", hidden when the form does not match.
- Fit: the new fall-back behaviour of the hook (fits at base grows; too long shrinks to the floor; too long even at the floor returns to the base; the "bands only" step keeps its existing test). The CSS variables are set inline on the content element in the test, because jsdom loads no stylesheet.
- Stage shapes strip (decision 3): a fresh stage view shows the 28 px "Show the chord shapes" handle; a tap opens the strip and saves the stage setting; the normal view's setting is untouched either way; the saved stage setting is read back at launch.
- Existing tests that stay green **unchanged**, because the class names and the container below are kept: chart integrity (every song, normal and stage), stage polish, section focus, chord finder on stage, keyboard view (its fixture is a one-line prose Faith, so it exercises the prose path), page chart, band shapes, capo and simple, the editor tests, Move chords, original chart and saving. The whole suite is the bar, not these alone.
- Existing tests that **change, red first**: the diagrams-toggle case 'keeps the handle on stage, where a bigger chart matters most' expects the "Hide" handle on stage and becomes the decision-3 cases above; the song-order test's four chart-strip assertions read the letter and the full name, with "×2" kept, instead of "Intro", "V", "C×2", while its form-editor assertions stay; the bar-chart test, the only test of the bar grid component, is rewritten for the new bars component (it asserts today's per-section column counts); the theory test's 'returns default for unknown sections' loses `solo` and gains the colour cases above; the view-settings test gains 'toggling on stage leaves the normal setting alone' and the hydrate test a relaunch case.

**The DOM contract, so the kept tests keep passing.** The new chart is rendered inside the existing `.chart-sections` container, which keeps its class and its ref (the page-turn function and the fit hook's "bands only" measurement both use it). Each band is a `.band` with its colour in a `--band` custom property; each section's bars are one `.chart-chords`; the rows container is `.bar-grid`; each bar cell is `.bar`, with every chord, `%`, `N.C.` and `(xN)` a span directly inside it; a bar-less line is `.chart-line.bar-plain`; the first and last bar of a written line carry `.bar-first` and `.bar-last`; `%` keeps `.bar-repeat` and its aria-label; `N.C.` and `(xN)` keep `.chart-mark`; padding cells are `.bar-pad`, never `.bar`, so no test counts them as bars. A band header is `<div class="band-head"><span class="band-letter" aria-hidden="true">A</span><button class="chart-label chart-label-btn" aria-pressed="…">Intro</button><span class="band-rule"></span></div>`, with a `<div class="chart-label">` in place of the button when the header is plain text.

**Visual acceptance, not in vitest** (jsdom has no layout): headless Chrome screenshots of Kissing a Fool and Faith at 820×1180, 1180×820 and 390×844, dark and stage, checked for: 4 / 8 / 2 columns; bar lines aligned down the page; no chord text, `%`, `N.C.` or `(xN)` under 24 px; headers, chips and pills at least 16 px; cells at least 44 px; strip letters matching band letters; the fit numbers in Part 5 corrected to measured values in this spec.

**Build order.** Five steps, each test-green:

1. `sectionLetters` and the two `sectionColor` fixes (pure functions; the colour change shows in the editor and the chord search's song view at once).
2. The bands: one grid, headers with letters, the lettered strip, bands.css with its size variables.
3. The fit fall-back and the CSS variables in the hook.
4. The Stage theme keeps section colours (theme.css only; decision 1).
5. The stage shapes-strip setting (decision 3).

Steps 1, 4 and 5 can each ship or be reverted alone; 4 and 5 are the two that touch other screens. Steps 2 and 3 ship together, because until step 3 the hook still searches today's 20 to 64 px and a long song could land at 20 px chords.

**Release.** One version (3.64.0) for the five steps. Tests and build pass, push to main, confirm the version in the live bundle, then reload on the iPad. Rolling back is a version bump back; no saved data is affected.

**Risks, stated.**

- In landscape, an 8-bar row with several two-chord bars is taller than its neighbours because dense bars stack (eight bars in Kissing a Fool, in the Chorus and both bridges; none in portrait). Chorus rows will look busier than Verse rows.
- Faith in portrait with the strip open scrolls a little where today it fits (Part 5). Short songs trade their very large fitted text for the floors.
- The light theme's tints and filled letter boxes have not been drawn. They use the darker light-theme colours already in the stylesheet; checked in the screenshots.
- Faith and other short songs lose the very large fitted text they have today (up to 39 px) when the shapes strip is open, in exchange for structure. Decision 3 gives most of it back on stage.
- The light theme's section colours are already darker than the dark theme's; the Stage shades are new and were chosen by eye, not measured for contrast. Checked in the screenshots.
- `color-mix` is already used by the app, so no new browser requirement.

## Where the code goes

All under `app/src/`. New and edited files stay under the 800-line rule; the chart's pieces are split by job. The one file already over it, `styles/layout.css`, only loses lines.

- `music/letters.ts` (new): `sectionLetters(names)` returns the letter for each section in chart order. Pure, tested.
- `music/theory.ts`: `sectionColor` learns the "ends with" rule and "solo".
- `components/song/BandChart.tsx` (new): the bands, in chart order; each with its header (letter box, name, the focus button) and its bars. Rendered inside the existing `.chart-sections` container, replacing the per-section labels and chords.
- `components/song/BandBars.tsx` (new): one section's bars in the shared column count: rows, padding cells, the double bar, chord cells, `%`, `N.C.` and `(xN)`. Takes the token renderer only; it writes the padding cells after every line and the stylesheet decides which show (Part 1).
- `components/song/BarGrid.tsx`: deleted; its only test, `tests/components/bar-chart.test.tsx`, is rewritten for `BandBars`.
- `components/song/FormStrip.tsx`: filled chips with the letter box and full names; takes the letters from `SongSheet`.
- `components/song/SongSheet.tsx`: `renderBody` draws `BandChart` when any section has bars, else today's sections; passes letters to the strip; fit options for bands (base, range and fall-back from CSS; no no-wrap search and no cramped flag). The `.chart` element gets a class for the bands layout so the stylesheet can scope its sizes.
- `hooks/use-fit-text.ts`: a fall-back size when nothing fits, and reading min, max and fall-back from the content's CSS variables when asked to.
- `styles/bands.css` (new, imported from `styles/global.css` like the others): the two media queries, the size variables per screen, bands, headers, letter boxes, cells, bar lines, double bar, stacking, and the form chips (moved out of layout.css).
- `styles/bars.css`: its per-section chart sizing goes (`--bars`, `--bars-half`, `width: max-content`, `data-narrow`, `data-wrap`); the `.bar-*` rules move to bands.css, rewritten for the shared column count; the editor rules stay.
- `styles/layout.css`: already 1133 lines, over the project's 800-line rule, so nothing is added to it. The form-strip rules move out to bands.css, and the title and pill sizes are edits to existing lines. The file ends shorter than it starts.
- `styles/theme.css`: `--section-solo` in all three themes; the Stage theme's section colours (decision 1).
- `store/view-settings.ts`: a `stageDiagramsVisible` flag, default false; a selector that answers "are the shapes shown" from the stage flag on stage and from `diagramsVisible` otherwise; `toggleDiagrams` flips and saves the current view's flag. `store/persistence.ts`: save and read the stage flag. `store/use-store.ts`: hydrate reads it beside the normal flag. `types.ts` is not touched. Readers: `components/diagrams/DiagramsBar.tsx`, `components/song/SongSheet.tsx` (the header is a button only when the shapes are shown and the view is not the keyboard) and the menu label in `components/layout/TopBar.tsx`.
- `version.ts`: 3.64.0.
- Tests live under `tests/`, mirroring the source: `tests/components/bar-chart.test.tsx` is rewritten; new `tests/music/letters.test.ts` and `tests/components/band-chart.test.tsx`; `tests/music/theory.test.ts`, `tests/components/song-order.test.tsx`, `tests/hooks/use-fit-text.test.tsx`, `tests/store/view-settings.test.ts`, `tests/store/hydrate.test.ts` and `tests/components/diagrams-toggle.test.tsx` change or gain cases as listed in Part 9.

## Not in this spec

- Careless Whisper in bars (the last of the 21; next task), and the sync design ("edits in one place").
- Tapping a form chip to scroll to its band.
- Scroll-snap after a swipe, auto-scroll, tempo-driven anything, any "you are here" marker.
- Beat ticks and two-tier chord symbols (the Beats design).
- The editor's drawing of bars, the top bar's height, the light theme beyond its variables.
- The review document's wrong path for the bar grid component (fixed when that document is next touched).
