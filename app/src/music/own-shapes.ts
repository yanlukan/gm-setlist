// Shapes the player writes as fret text (x-x-2-2-3-5): reading them, naming
// the notes they sound, and warning of notes the chord does not have.
import type { ChordVoicing } from '../data/chords-db'
import { getRoots } from './theory'
import { chordNotes, pitchAt, voicingFromText } from './voicings'

/** A shape as a player writes it (x-x-2-2-3-5, "x x 2 2 3 5" or xx2235) as a diagram, or null. */
export function parseShapeText(text: string): ChordVoicing | null {
  const tidy = text.trim().toLowerCase()
  const parts = /[-\s,]/.test(tidy) ? tidy.split(/[-\s,]+/) : [...tidy]
  if (parts.length !== 6 || parts.every(p => p === 'x')) return null
  return voicingFromText(parts.join('-'))
}

/** The pitch class each string sounds, low to high; null for a muted string. */
function pitches(v: ChordVoicing): Array<number | null> {
  return v.f.map((f, string) => (f === null ? null : pitchAt(string, f === 0 || v.s === 0 ? f : v.s + f - 1)))
}

/** The notes a shape sounds, low string to high, in sharps unless asked for flats. */
export function shapeNotes(v: ChordVoicing, flats = false): string[] {
  const names = getRoots(flats)
  return pitches(v).flatMap(p => (p === null ? [] : [names[p]]))
}

/** The notes a shape sounds that the chord does not have, spelled the chord's way. */
export function outsideNotes(name: string, v: ChordVoicing): string[] {
  const notes = chordNotes(name)
  if (!notes) return []
  const names = getRoots(/^[A-G]b/.test(name))
  const inside = new Set([...notes.tones, ...(notes.bass === null ? [] : [notes.bass])])
  const out: string[] = []
  for (const p of pitches(v)) {
    if (p !== null && !inside.has(p) && !out.includes(names[p])) out.push(names[p])
  }
  return out
}
