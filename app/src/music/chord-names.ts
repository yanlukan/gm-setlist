// Chord names as people type them: "em11", "E min 11", "FΔ7", "c/e". The
// charts use one spelling (Em11, Fmaj7, C/E), so a typed name is tidied to
// it, and only names the app can draw shapes for count as chords.
import { chordNotes } from './voicings'
import { normalizeQuality } from '../data/chords-db'

export interface QualityGroup {
  label: string
  qualities: string[]
}

/** Every chord quality the app knows, grouped the way a player thinks of them. */
export const QUALITY_GROUPS: QualityGroup[] = [
  { label: 'Triads', qualities: ['', 'm', 'dim', 'aug', '5'] },
  { label: 'Sixths', qualities: ['6', 'm6', '69', 'm69'] },
  { label: 'Sevenths', qualities: ['7', 'maj7', 'm7', 'm7b5', 'dim7', 'mmaj7', '7sus4', '7b5', 'aug7'] },
  { label: 'Ninths and up', qualities: ['add9', 'madd9', '9', 'm9', 'maj9', 'mmaj9', '11', 'm11', 'maj11', '13', 'm13', 'maj13'] },
  { label: 'Suspended', qualities: ['sus2', 'sus4', 'sus24'] },
  { label: 'Altered', qualities: ['7b9', '7#9', '9b5', 'aug9', '9#11', 'maj7#5', 'maj7b5', 'b5', '6b5'] },
]

const QUALITIES = QUALITY_GROUPS.flatMap(g => g.qualities)

const note = (text: string) => text[0].toUpperCase() + text.slice(1).replace('♯', '#').replace('♭', 'b')

/** The tidied quality of a typed name, in the charts' spelling. */
function tidyQuality(typed: string): string {
  let q = typed.replace(/\s+/g, '').replace(/^(maj|min|dim|aug|sus|add)/i, w => w.toLowerCase())
  q = normalizeQuality(q.replace(/^us/, 'sus'))
  if (q === '#5') return 'aug'
  if (/^[b#]/.test(q) && q !== 'b5') return '7' + q
  return q
}

/** The charts' spelling of a typed chord name, or null when it is not one. */
export function normalizeChordName(typed: string): string | null {
  const m = typed.trim().match(/^([A-Ga-g][#b♯♭]?)(.*?)(?:\/([A-Ga-g][#b♯♭]?))?$/)
  if (!m) return null
  const name = note(m[1]) + tidyQuality(m[2]) + (m[3] ? '/' + note(m[3]) : '')
  return chordNotes(name) ? name : null
}

/**
 * Up to eight chords a typed start could become: the song's own chords that
 * start the same way first (words that are not chords, like a half-typed
 * one, are skipped), then every quality on that root.
 */
export function chordSuggestions(typed: string, songChords: string[] = []): string[] {
  const m = typed.trim().match(/^([A-Ga-g][#b♯♭]?)(.*)$/)
  if (!m) return []
  const root = note(m[1])
  const rest = m[2].toLowerCase().replace(/^(min|-)/, 'm')
  const out: string[] = []
  const offer = (name: string) => {
    if (name.toLowerCase().startsWith((root + rest).toLowerCase()) && !out.includes(name)) out.push(name)
  }
  for (const chord of songChords) if (chordNotes(chord)) offer(chord)
  for (const q of QUALITIES) offer(root + q)
  return out.slice(0, 8)
}
