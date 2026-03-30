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

export const CHORD_DB = buildChordDB()
