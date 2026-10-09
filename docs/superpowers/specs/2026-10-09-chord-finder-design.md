# Chord finder, own shapes and typed chords that map to diagrams — Design Spec

## Problem

1. The app knows a chord only when it can draw it. A shape the user plays that
   the library and the generator do not have (Em11 as x-x-2-2-3-5 or
   x-x-7-7-10-x) cannot be chosen, so the chart shows a shape the user does
   not play.
2. There is no way to look a chord up. The voicing picker only opens from a
   chord that is already on a chart, so "how is a Dm9 played?" has no answer
   in the app.
3. Typing chords in the editor (Type mode) does not lead to a diagram: a
   typed name is checked ("Not a chord: ...") but never offered as a chord to
   pick, and the keyboard's "Any" tab knows only 13 qualities of the 41 the
   app can draw.
4. On the iPad, Return once put everything on one line and glued chords
   ("D" "E" became "DE"). That was the contentEditable editor, replaced by a
   textarea in 3.34.0 (commit b8556bb). It is fixed; 3.51.1 was checked on
   the simulator. This spec records it so it is not chased again.

No published library has every voicing of every chord. `chords-db` has a few
per chord and the app already generates the rest. The gap is the shapes the
generator refuses (no third, no root, open strings, two strings) and the way
in: the finder and the user's own shapes.

## Solution

### 1. Chord Finder

A full-screen sheet opened from the ⋮ menu ("Chord Finder…") and from a
"Find" key on the chord keyboard while editing.

- A name field. What is typed is normalised as you type: `em11`, `E min 11`,
  `Emin11`, `E-11` all read as Em11; `bb`/`Bb`, `a#m7`, `Fmaj7`, `FΔ7`.
  Under the field, up to eight suggestions (chord names that start with what
  was typed, the song's own chords first when opened from a song). Tapping
  one fills the field.
- For a known chord: the notes it sounds (E G B D F# A), then every shape as
  a large diagram with a play button and its fret text, marked where it comes
  from: "Yours", "Songbook"/"Researched", "Library", "Generated".
- A "More shapes" switch. Off (default) shows the list the chart uses
  (`voicingsFor`). On adds the wider generator's shapes: dropped third or root,
  open strings, two to six strings, frets up to 15, marked "Generated".
- "Your shape": a fret field (`x-x-2-2-3-5`). While it parses, the app draws
  it, names the notes it sounds, and says which of them are outside the chord
  ("F is not in Em11") without refusing. "Save" keeps it under the chord's
  name. A saved shape has a "Remove" button.
- Opened from a song's chord (the editor's Find key, or the picker), tapping a
  shape sets that song's pick for the chord, as the voicing picker does, and
  the finder closes.

### 2. Own shapes

- Stored globally under the chord name: `ownShapes: Record<string, string[]>`
  (fret texts), in the `settings` store under the key `ownShapes`, hydrated at
  start, in backups (`exportAllData` / `validateBackup` / `importAllData`).
- `voicingsFor(name)` keeps its order (library → generated → researched) and
  appends own shapes at the end, so every saved pick index still means the
  same shape. Own shapes are marked "Yours" in the finder, the voicing picker
  and the diagrams strip. A removed own shape disappears from the list.
- A song's pick of an own shape is stored by its fret text, not by index:
  `SongEdits.shapes: Record<string, number | string>`. A string pick resolves
  through `indexOfShape`; if the shape was removed the pick is ignored.
- `clearVoicing` / "Use the recommended shape" are unchanged.

### 3. Editor

- The keyboard's "Any" tab lists every quality the app can draw, grouped:
  triads (`'' m dim aug 5`), sixths (`6 m6 69 m69`), sevenths (`7 maj7 m7
  m7b5 dim7 mmaj7 7sus4 7b5 aug7`), ninths and up (`add9 madd9 9 m9 maj9
  mmaj9 11 m11 maj11 13 maj13`), suspended (`sus2 sus4 sus24`), altered
  (`7b9 7#9 9b5 aug9 9#11 maj7#5 maj7b5 b5 6b5`). Plus a "Find…" key that
  opens the finder; a shape tapped there puts the chord on the chart at the
  cursor and sets the song's pick.
- Type mode: a suggestion row above the textarea while the word at the caret
  is a chord prefix; tapping a suggestion replaces the word. Unknown names
  stay flagged red.

### 4. Housekeeping

- `ChordPicker.tsx` is unused; delete it.
- The voicing picker's text no longer claims a tapped shape is "used in every
  song" (picks have been per song since 3.50).

## Architecture

- `src/music/chord-names.ts` (new): `normalizeChordName(text)` →
  canonical name or null (root letter + accidental, quality via
  `normalizeQuality`, slash bass; `chordNotes` must accept it);
  `chordSuggestions(prefix, first?: string[])`; `QUALITY_GROUPS`.
- `src/music/own-shapes.ts` (new): `parseShapeText(text)` → fret text or
  null; `shapeNotes(text)` → note names low to high; `outsideNotes(name,
  text)`; `OWN_SHAPES` registry (`setOwnShapes`, `ownShapesFor(name)`) that
  `voicingsFor` reads and that clears the voicings cache when set.
- `src/music/more-shapes.ts` (new): `moreShapesFor(name)` — the widened
  generator, separate from the chart's list.
- `src/store/own-shapes.ts` (new): the `ownShapes` slice (`addOwnShape`,
  `removeOwnShape`), persisted with `saveSetting('ownShapes', …)`; hydrate
  reads it with one more `getSetting` (use-store.ts must not grow: move
  `selectVoicing`/`clearVoicing` into the slice file to pay for it).
- `src/components/finder/ChordFinder.tsx` (+ `chord-finder.css`): the sheet.
  Props: `{ chord?, song?: title, onPick?(chord, index|text), onClose }`.
- `shapeChoice` (use-band-positions.ts) and `pickSongShape` take
  `number | string`; `DiagramsBar` marks own shapes "Yours".
- `ChordKeyboard`: `QUALITY_GROUPS` on the Any tab, `onFind` prop.
  `ChartEditor`: the suggestion row and the finder; a pick inserts and sets
  the shape.
- Version 3.52.0.

## Testing

- chord-names: `em11`, `E min 11`, `E-11`, `FΔ7`, `bbm7b5`, `C/E`, nonsense.
  Suggestions for `Em1` include Em11, Em13; song chords first.
- own-shapes: parse `x-x-2-2-3-5`, reject `x-x-2`, `x-x-2-2-3-99`; notes of
  x-x-2-2-3-5 are E A D A; outside notes of `x-x-2-2-3-6` for Em11 is `A#`.
- more-shapes: Em11 includes x-x-2-2-3-5 and x-x-7-7-10-x; nothing in it is
  in `voicingsFor`; every shape sounds only chord tones.
- voicings: own shapes appear after the researched ones and are marked;
  indices of the earlier shapes unchanged; cache cleared on change.
- store: add/remove own shapes saved and hydrated; export includes them;
  import restores them; a song pick by text resolves and survives an index
  shift; a removed own shape's pick falls back to the recommended one.
- components: finder normalises as you type, lists shapes with marks, "More
  shapes" adds the user's Em11 shapes, saving an own shape puts it first in
  the voicing picker marked "Yours" and on the strip; Any tab has `Em11`;
  Type mode suggestion completes `em1` to Em11; menu opens the finder.
