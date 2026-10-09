// Every further way to finger a chord on three to six neighbouring strings:
// only chord notes, at most two of the notes that matter left out, and the
// fretted notes within reach. The chord finder's "More shapes" switch shows
// them, so a shape the band plays (Em11 as x-x-2-2-3-5) can be found and kept.
import type { ChordVoicing } from '../data/chords-db'
import { chordNotes, pitchAt, shapeText, voicingFromText, voicingsFor } from './voicings'

const MAX_FRET = 15
const MAX_SPAN = 3
const MAX_MISSING = 2

interface Found {
  frets: Array<number | null>
  missing: number
  min: number
  count: number
}

/** Shapes for a chord beyond its usual list, fewest missing notes first, then lowest, then fullest. */
export function moreShapesFor(name: string): ChordVoicing[] {
  const notes = chordNotes(name)
  if (!notes) return []
  const allowed = new Set([...notes.tones, ...(notes.bass === null ? [] : [notes.bass])])
  const bottom = notes.bass
  const found: Found[] = []

  for (let count = 3; count <= 6; count++) {
    for (let low = 0; low + count <= 6; low++) {
      // Each shape is found once: in the window that starts at its lowest fretted note.
      for (let w = 0; w <= MAX_FRET - MAX_SPAN; w++) {
        const frets: Array<number | null> = [null, null, null, null, null, null]
        const fill = (k: number, atStart: boolean) => {
          if (k === count) {
            if (!atStart) return
            const played = frets.flatMap((f, s) => (f === null ? [] : [pitchAt(s, f)]))
            if (new Set(played).size < 2) return
            if (bottom !== null && played[0] !== bottom) return
            const missing = notes.essential.filter(pc => !played.includes(pc)).length
            if (missing > MAX_MISSING) return
            found.push({ frets: [...frets], missing, min: w, count })
            return
          }
          const string = low + k
          const options = w === 0 ? [0] : [0, w, w + 1, w + 2, w + 3]
          for (const f of options) {
            if (f > MAX_FRET || !allowed.has(pitchAt(string, f))) continue
            frets[string] = f
            fill(k + 1, atStart || f === w)
            frets[string] = null
          }
        }
        fill(0, w === 0)
      }
    }
  }

  found.sort((a, b) => a.missing - b.missing || a.min - b.min || b.count - a.count)
  const have = new Set(voicingsFor(name).map(shapeText))
  const out: ChordVoicing[] = []
  for (const shape of found) {
    const voicing = voicingFromText(shape.frets.map(f => (f === null ? 'x' : String(f))).join('-'))
    if (!voicing || have.has(shapeText(voicing))) continue
    have.add(shapeText(voicing))
    out.push(voicing)
  }
  return out
}
