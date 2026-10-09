# Keyboard view and a visible way to hide the chord diagrams — Design Spec

## Problem

1. The chord diagrams can be hidden, but only from the first entry of the ⋮ menu
   ("Hide Chord Diagrams"). The user looked for the control where the diagrams
   are, on the chart, and did not find it.
2. The band's keyboard player wants to use PlayBook too. They need the chords,
   not guitar shapes, frets, capos or GX-10 sound names.

## Solution

### 1. Hide and show the diagrams on the chart

- The diagrams strip starts with a slim vertical handle (about 22 px wide, the
  height of a tile) labelled "Hide the chord shapes". Tapping it hides the strip.
- While hidden, a thin full-width bar ("Chord shapes ˄", about 28 px tall)
  sits where the strip was, between the chart and the song navigation. Tapping
  it shows the strip again.
- Both use the existing saved `diagramsVisible` setting and work on stage too
  (the menu entry already does). Neither shows while editing (the chord
  keyboard takes the strip's place) nor in the keyboard view.
- The menu entry "Hide/Show Chord Diagrams" stays.

### 2. Keyboard view

A saved setting `instrument: 'guitar' | 'keyboard'`, default `guitar`, toggled
from the first ⋮ menu entry: "Instrument: guitar" / "Instrument: keyboard".
It is remembered per copy of the app, like the other view settings.

In the keyboard view:

| Element | Guitar view | Keyboard view |
|---|---|---|
| Diagrams strip, hide/show handle, "Hide Chord Diagrams" menu entry | shown | gone |
| "Guitar: each song its own / electric / acoustic" menu entry | shown | gone |
| Top bar Electric/Acoustic button | shown | a plain "Keyboard" badge |
| Top bar Capo button, capo banner on the chart | shown | gone |
| Chords on the chart | at the shapes' pitch (band key less the capo) | at the sounding pitch (band key); any capo is ignored |
| Position pill ("Frets 2–9") on the chart title line, in the song list | shown | gone |
| GX-10 sound name beside the title and on the Next button | shown | gone |
| Chords on the chart | tappable (voicing picker) | plain text |
| Section labels | buttons that focus the diagrams | plain labels |
| "Simplify Chords (Cmaj7 → C)" | acoustic or electric rule by guitar | always the plain rule (Cmaj7 → C), as the label says |
| Arrangement cues ("GUITAR TACET", "12/8 shuffle") | shown | shown (they are for the whole band) |
| Editing, transpose, setlists, notes, form row, stage mode | unchanged | unchanged; edits are stored at the song's own pitch with no capo offset |

### Why the capo is ignored

With a capo on 2, the guitar chart shows A shapes for a song in B. A keyboard
player plays what sounds, so the keyboard view shows B. This is the one place
the two views show different chord names for the same song, and it is the
correct one: the "Key" badge in the top bar already shows the sounding key.

## Architecture

- `app/src/music/chart-view.ts`: `Instrument` type; `ChartView.instrument`;
  `capoFor`, `shapeShift`, `shapeSections` take an optional `view` and ignore
  the capo for the keyboard; `simplifyRuleFor(song, edits, view)` gives the
  guitar whose simplify rule applies (always `acoustic` for the keyboard).
- `app/src/store/view-settings.ts` (new): the view settings slice of the store:
  theme, view mode, diagrams visible, simple chords, guitar, instrument, and
  their actions. `use-store.ts` spreads it in and shrinks (it is over the
  800-line limit; it must not grow). `hydrate` reads the `instrument` setting.
- `DiagramsBar` renders the strip with the hide handle, or the collapsed bar,
  from `diagramsVisible`, and renders nothing for the keyboard; `App` only
  gates it on edit mode.
- `TopBar`, `SongSheet`, `SongGrid`, `BottomBar` read `instrument` through
  `useChartView()` and drop the guitar-only elements.
- Version 3.51.0.

## Testing

- Store: `setInstrument` is saved and restored by `hydrate`; default is guitar.
- Chart view: `shapeSections` ignores the capo for the keyboard; the simplify
  rule is plain for the keyboard.
- Components, keyboard view: no diagrams strip, no handle, no capo button, no
  Electric button, a "Keyboard" badge, no position pill, no GX-10 name, plain
  (untappable) chords and labels, Faith with a capo on 2 reads in B, menu
  without the guitar entries.
- Components, guitar view: the strip's handle hides the diagrams, the collapsed
  bar shows them again, both saved; neither appears while editing.
- Existing suites stay green (section focus, capo, band shapes, stage polish).
