import guitarData from '@tombatossals/chords-db/lib/guitar.json'

export interface ChordVoicing {
  f: (number | null)[] // 6 fret values: null=muted, 0=open, N=fret
  s: number            // start fret (0=nut position)
  l: string            // position label
}

// Map suffix names from the DB to common chord notation
const SUFFIX_MAP: Record<string, string> = {
  'major': '',
  'minor': 'm',
  'dim': 'dim',
  'dim7': 'dim7',
  'sus2': 'sus2',
  'sus4': 'sus4',
  '7sus4': '7sus4',
  'alt': 'alt',
  'aug': 'aug',
  '6': '6',
  '69': '69',
  '7': '7',
  '7b5': '7b5',
  'aug7': 'aug7',
  '9': '9',
  '9b5': '9b5',
  'aug9': 'aug9',
  '7b9': '7b9',
  '7#9': '7#9',
  '11': '11',
  '9#11': '9#11',
  '13': '13',
  'maj7': 'maj7',
  'maj7b5': 'maj7b5',
  'maj7#5': 'maj7#5',
  'maj9': 'maj9',
  'maj11': 'maj11',
  'maj13': 'maj13',
  'm6': 'm6',
  'm69': 'm69',
  'm7': 'm7',
  'm7b5': 'm7b5',
  'm9': 'm9',
  'm11': 'm11',
  'mmaj7': 'mmaj7',
  'mmaj7b5': 'mmaj7b5',
  'mmaj9': 'mmaj9',
  'mmaj11': 'mmaj11',
  'add9': 'add9',
  'madd9': 'madd9',
  '7sg': '7sg',
}

// Key names in the DB use "Csharp"/"Fsharp" instead of "C#"/"F#"
const KEY_MAP: Record<string, string> = {
  'C': 'C', 'Csharp': 'C#', 'D': 'D', 'Eb': 'Eb',
  'E': 'E', 'F': 'F', 'Fsharp': 'F#', 'G': 'G',
  'Ab': 'Ab', 'A': 'A', 'Bb': 'Bb', 'B': 'B',
}

function positionLabel(baseFret: number): string {
  if (baseFret <= 1) return 'Open'
  const suffixes: Record<number, string> = { 2: 'nd', 3: 'rd' }
  return `${baseFret}${suffixes[baseFret] || 'th'} fret`
}

function convertPosition(pos: { frets: number[]; baseFret: number }): ChordVoicing {
  return {
    f: pos.frets.map(f => f === -1 ? null : f),
    s: pos.baseFret <= 1 ? 0 : pos.baseFret,
    l: positionLabel(pos.baseFret),
  }
}

// Build the complete chord database at import time
function buildChordDB(): Record<string, ChordVoicing[]> {
  const db: Record<string, ChordVoicing[]> = {}
  const chords = guitarData.chords as Record<string, Array<{
    key: string; suffix: string;
    positions: Array<{ frets: number[]; baseFret: number }>
  }>>

  for (const [dbKey, chordList] of Object.entries(chords)) {
    const rootNote = KEY_MAP[dbKey] || dbKey

    for (const chord of chordList) {
      const suffix = SUFFIX_MAP[chord.suffix]
      if (suffix === undefined) {
        // Slash chords
        if (chord.suffix.startsWith('/') || chord.suffix.startsWith('m/')) {
          db[rootNote + chord.suffix] = chord.positions.map(convertPosition)
        }
        continue
      }

      const name = rootNote + suffix
      db[name] = chord.positions.map(convertPosition)

      // Add enharmonic equivalents so both C# and Db work
      const enharmonics: Record<string, string> = {
        'C#': 'Db', 'Eb': 'D#', 'F#': 'Gb', 'Ab': 'G#', 'Bb': 'A#',
      }
      const alt = enharmonics[rootNote]
      if (alt && !db[alt + suffix]) {
        db[alt + suffix] = db[name]
      }
    }
  }

  return db
}

/**
 * Voicings the database lacks, as printed in the IMP "George Michael
 * Complete" songbook, moved up a fret: the book plays them with a capo on the
 * first fret, and the charts here are at concert pitch.
 */
const SONGBOOK_VOICINGS: Record<string, ChordVoicing[]> = {
  // Kissing a Fool. Root on the A string, then flat fifth, root, third.
  'B(b5)': [{ f: [null, 2, 3, 4, 4, null], s: 0, l: 'Open' }],
  'C#(b5)': [{ f: [null, 1, 2, 3, 3, null], s: 4, l: '4th fret' }],
  'C#6(b5)': [{ f: [null, null, 3, 3, 2, 3], s: 0, l: 'Open' }],
  // The same chords in D, where the band plays it: the book's boxes without the capo.
  'Bb(b5)': [{ f: [null, 1, 2, 3, 3, null], s: 0, l: 'Open' }],
  'C(b5)': [{ f: [null, 1, 2, 3, 3, null], s: 3, l: '3rd fret' }],
  'C6(b5)': [{ f: [null, null, 2, 2, 1, 2], s: 0, l: 'Open' }],
  // Everything She Wants: E with both the 2nd and the 4th, no 3rd
  'Esus24': [{ f: [null, null, 2, 2, 0, 2], s: 0, l: 'Open' }],
  // Jesus to a Child: the book's capo-4 shape (x-0-2-4-3-0), at concert pitch
  'C#sus24': [{ f: [null, 1, 3, 5, 4, 1], s: 4, l: '4th fret' }],
}

const RAW_DB = { ...buildChordDB(), ...SONGBOOK_VOICINGS }

/** Semitone of every root spelling, and the spelling the database uses for each. */
const NOTE_INDEX: Record<string, number> = {
  'C': 0, 'B#': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'Fb': 4,
  'F': 5, 'E#': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
  'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11,
}
const DB_ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

// Enharmonic map for normalization
const ENHARMONIC: Record<string, string> = {
  'A#': 'Bb', 'B#': 'C', 'C#': 'Db', 'D#': 'Eb',
  'E#': 'F', 'F#': 'Gb', 'G#': 'Ab',
  'Cb': 'B', 'Fb': 'E',
}

/**
 * Chord-symbol spellings people actually type, mapped to the database's
 * suffixes: Am(maj7), C-7, Bø, E°7, G+, Cmaj, Dsus ...
 */
function normalizeQuality(quality: string): string {
  let q = quality.replace(/[()]/g, '').replace(/\s+/g, '')
  if (q.startsWith('min') && !q.startsWith('minor')) q = 'm' + q.slice(3)
  if (q.startsWith('minor')) q = 'm' + q.slice(5)
  if (q.startsWith('-')) q = 'm' + q.slice(1)
  q = q
    .replace(/^M7|^Δ7?|^ma7/, 'maj7')
    .replace(/^maj$/, '')
    .replace(/^ø7?$/, 'm7b5')
    .replace(/^(°|o)7$/, 'dim7')
    .replace(/^(°|o)$/, 'dim')
    .replace(/^\+7$|^7\+5$|^7#5$/, 'aug7')
    .replace(/^\+$/, 'aug')
    .replace(/^sus$/, 'sus4')
    .replace(/^6\/9$/, '69')
    .replace(/^2$/, 'sus2')
  return q
}

/**
 * Simpler chords of the SAME family to fall back on when a voicing isn't in
 * the database. A minor chord must never fall back to a major diagram: on
 * stage that is the wrong third, not a simplification.
 */
function fallbackQualities(q: string): string[] {
  if (q === 'm7b5' || q.startsWith('dim')) return ['m7b5', 'dim', 'm']
  if (/^m(?!aj)/.test(q)) return /\d/.test(q) ? ['m7', 'm'] : ['m']
  if (q.startsWith('maj') || q === '6' || q === '69' || q.startsWith('add')) return ['maj7', '']
  if (q.startsWith('aug')) return ['aug', '']
  if (q.startsWith('sus') || q.startsWith('7sus')) return q.includes('2') ? ['sus2', ''] : ['sus4', '']
  if (/^(7|9|11|13)/.test(q)) return ['7', '']
  return ['']
}

/**
 * Chord lookup: exact name first, then without a slash bass, then common
 * spellings and enharmonic roots, then a simpler chord of the same family.
 * With `simplify: false` it only answers with the chord as written.
 */
export function lookupChord(name: string, { simplify = true }: { simplify?: boolean } = {}): ChordVoicing[] | undefined {
  if (!name) return undefined
  if (RAW_DB[name]) return RAW_DB[name]

  // Am7/G -> Am7: the diagram shows the chord; the bass is for the bass player
  const plain = name.replace(/\/[A-G][#b]?$/, '')
  if (RAW_DB[plain]) return RAW_DB[plain]

  const m = plain.match(/^([A-G][#b]?)(.*)$/)
  if (!m) return undefined
  const root = m[1]
  const roots = [root, ENHARMONIC[root], ...Object.entries(ENHARMONIC).filter(([, to]) => to === root).map(([from]) => from)]
    .filter((r): r is string => !!r)
  const find = (quality: string) => {
    for (const r of roots) if (RAW_DB[r + quality]) return RAW_DB[r + quality]
    return undefined
  }

  // Written exactly as the songbook has it, e.g. Cb(b5)
  const asWritten = find(m[2])
  if (asWritten) return asWritten

  let quality = normalizeQuality(
    m[2].replace('no3d', '').replace('add11', '').replace('add13', '').replace(/^us/, 'sus'),
  )
  if (quality === '#5') quality = 'aug'

  // X6(b5) has exactly the notes of the m7b5 chord a tritone away:
  // E6(b5) is E G# Bb C#, which is Bbm7b5.
  if (quality === '6b5' && NOTE_INDEX[root] !== undefined) {
    const tritone = RAW_DB[DB_ROOTS[(NOTE_INDEX[root] + 6) % 12] + 'm7b5']
    if (tritone) return tritone
  }

  // A bare alteration, as in A(b9), must never be glued straight onto the
  // root: A + b9 reads as Ab9, a different chord altogether.
  const bare = /^[b#]/.test(quality)
  if (!bare) {
    const exact = find(quality)
    if (exact) return exact
  }

  // Everything below shows a simpler or fuller chord than the one written.
  if (!simplify) return undefined

  // A bare alteration is shown on the dominant seventh it implies: A(b9) as A7b9.
  if (bare) {
    quality = '7' + quality
    const dominant = find(quality)
    if (dominant) return dominant
  }

  // Power chords (C5) have no third; the major shape is the usual stand-in
  if (/^5$/.test(quality)) return find('')

  for (const simpler of fallbackQualities(quality)) {
    const found = find(simpler)
    if (found) return found
  }
  return undefined
}

// Export both raw DB and lookup function
export const CHORD_DB = RAW_DB
