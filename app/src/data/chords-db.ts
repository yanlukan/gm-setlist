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

const RAW_DB = buildChordDB()

// Enharmonic map for normalization
const ENHARMONIC: Record<string, string> = {
  'A#': 'Bb', 'B#': 'C', 'C#': 'Db', 'D#': 'Eb',
  'E#': 'F', 'F#': 'Gb', 'G#': 'Ab',
  'Cb': 'B', 'Fb': 'E',
}

/**
 * Smart chord lookup — tries exact match first, then progressively
 * simplifies the chord name to find the closest diagram.
 */
export function lookupChord(name: string): ChordVoicing[] | undefined {
  if (!name) return undefined

  // Exact match
  if (RAW_DB[name]) return RAW_DB[name]

  // Normalize: strip slash bass note (Am7/G -> Am7)
  let normalized = name.replace(/\/[A-G][#b]?$/, '')
  if (RAW_DB[normalized]) return RAW_DB[normalized]

  // Try enharmonic: A# -> Bb
  const rootMatch = normalized.match(/^([A-G][#b]?)(.*)$/)
  if (rootMatch) {
    const [, root, quality] = rootMatch
    const altRoot = ENHARMONIC[root]
    if (altRoot && RAW_DB[altRoot + quality]) return RAW_DB[altRoot + quality]

    // Reverse enharmonic: Bb -> A#
    for (const [from, to] of Object.entries(ENHARMONIC)) {
      if (to === root && RAW_DB[from + quality]) return RAW_DB[from + quality]
    }

    // Strip complex extensions: add9 -> add9, add11 -> maj, add13 -> maj
    let simpleQuality = quality
      .replace('no3d', '')       // Chordonomicon no-third notation
      .replace('add11', '')
      .replace('add13', '')
      .replace('add9', 'add9')   // keep add9
      .replace(/^us/, 'sus')     // fix A#us2 -> A#sus2

    if (simpleQuality !== quality && RAW_DB[root + simpleQuality]) {
      return RAW_DB[root + simpleQuality]
    }
    if (altRoot && simpleQuality !== quality && RAW_DB[altRoot + simpleQuality]) {
      return RAW_DB[altRoot + simpleQuality]
    }

    // Power chord (5) -> major
    if (quality === '5' || quality.endsWith('5')) {
      if (RAW_DB[root]) return RAW_DB[root]
      if (altRoot && RAW_DB[altRoot]) return RAW_DB[altRoot]
    }

    // Last resort: just the root (major chord)
    if (RAW_DB[root]) return RAW_DB[root]
    if (altRoot && RAW_DB[altRoot]) return RAW_DB[altRoot]
  }

  return undefined
}

// Export both raw DB and lookup function
export const CHORD_DB = RAW_DB
