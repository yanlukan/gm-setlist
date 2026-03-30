export interface ChordVoicing {
  f: (number | null)[] // 6 fret values: null=muted, 0=open, N=fret
  s: number // start fret (0=nut position)
  l: string // position label
}

// ── Hand-curated open & common voicings ─────────────────────────────
const CURATED: Record<string, ChordVoicing[]> = {
  'A': [{ f: [null, 0, 2, 2, 2, 0], s: 0, l: 'Open' }],
  'Am': [{ f: [null, 0, 2, 2, 1, 0], s: 0, l: 'Open' }],
  'A7': [{ f: [null, 0, 2, 0, 2, 0], s: 0, l: 'Open' }],
  'Am7': [{ f: [null, 0, 2, 0, 1, 0], s: 0, l: 'Open' }],
  'Amaj7': [{ f: [null, 0, 2, 1, 2, 0], s: 0, l: 'Open' }],
  'Asus4': [{ f: [null, 0, 2, 2, 3, 0], s: 0, l: 'Open' }],
  'Asus2': [{ f: [null, 0, 2, 2, 0, 0], s: 0, l: 'Open' }],
  'Adim': [{ f: [null, 0, 1, 2, 1, null], s: 0, l: 'Open' }],
  'A6': [{ f: [null, 0, 2, 2, 2, 2], s: 0, l: 'Open' }],
  'Am6': [{ f: [null, 0, 2, 2, 1, 2], s: 0, l: 'Open' }],
  'A9': [{ f: [null, 0, 2, 4, 2, 3], s: 0, l: 'Open' }],
  'Aadd9': [{ f: [null, 0, 2, 2, 2, 0], s: 0, l: 'Open' }], // same as open with open high E = B (9th)

  'B7': [{ f: [null, 2, 1, 2, 0, 2], s: 0, l: 'Open' }],

  'C': [{ f: [null, 3, 2, 0, 1, 0], s: 0, l: 'Open' }],
  'C7': [{ f: [null, 3, 2, 3, 1, 0], s: 0, l: 'Open' }],
  'Cmaj7': [{ f: [null, 3, 2, 0, 0, 0], s: 0, l: 'Open' }],
  'C6': [{ f: [null, 3, 2, 2, 1, 0], s: 0, l: 'Open' }],
  'Cm6': [{ f: [null, 3, 1, 2, 1, 3], s: 0, l: 'Open' }],
  'Cadd9': [{ f: [null, 3, 2, 0, 3, 0], s: 0, l: 'Open' }],

  'D': [{ f: [null, null, 0, 2, 3, 2], s: 0, l: 'Open' }],
  'Dm': [{ f: [null, null, 0, 2, 3, 1], s: 0, l: 'Open' }],
  'D7': [{ f: [null, null, 0, 2, 1, 2], s: 0, l: 'Open' }],
  'Dm7': [{ f: [null, null, 0, 2, 1, 1], s: 0, l: 'Open' }],
  'Dmaj7': [{ f: [null, null, 0, 2, 2, 2], s: 0, l: 'Open' }],
  'Dsus4': [{ f: [null, null, 0, 2, 3, 3], s: 0, l: 'Open' }],
  'Dsus2': [{ f: [null, null, 0, 2, 3, 0], s: 0, l: 'Open' }],
  'D6': [{ f: [null, null, 0, 2, 0, 2], s: 0, l: 'Open' }],
  'Dadd9': [{ f: [null, null, 0, 2, 3, 0], s: 0, l: 'Open' }],

  'E': [{ f: [0, 2, 2, 1, 0, 0], s: 0, l: 'Open' }],
  'Em': [{ f: [0, 2, 2, 0, 0, 0], s: 0, l: 'Open' }],
  'E7': [{ f: [0, 2, 0, 1, 0, 0], s: 0, l: 'Open' }],
  'Em7': [{ f: [0, 2, 0, 0, 0, 0], s: 0, l: 'Open' }],
  'Emaj7': [{ f: [0, 2, 1, 1, 0, 0], s: 0, l: 'Open' }],
  'E7sus4': [{ f: [0, 2, 0, 2, 0, 0], s: 0, l: 'Open' }],
  'Esus4': [{ f: [0, 2, 2, 2, 0, 0], s: 0, l: 'Open' }],
  'Em9': [{ f: [0, 2, 0, 0, 0, 2], s: 0, l: 'Open' }],
  'Eadd9': [{ f: [0, 2, 2, 1, 0, 2], s: 0, l: 'Open' }],

  'F': [
    { f: [1, 3, 3, 2, 1, 1], s: 0, l: '1st fret' },
    { f: [null, null, 3, 2, 1, 1], s: 0, l: 'Partial' },
  ],
  'Fmaj7': [
    { f: [null, null, 3, 2, 1, 0], s: 0, l: 'Open' },
    { f: [1, 3, 2, 2, 1, 1], s: 0, l: 'Full barre' },
  ],

  'G': [{ f: [3, 2, 0, 0, 0, 3], s: 0, l: 'Open' }],
  'G7': [{ f: [3, 2, 0, 0, 0, 1], s: 0, l: 'Open' }],
  'Gmaj7': [{ f: [3, 2, 0, 0, 0, 2], s: 0, l: 'Open' }],
  'Gadd9': [{ f: [3, 2, 0, 2, 0, 3], s: 0, l: 'Open' }],
}

// ── CAGED shape templates (fret offsets from open position) ─────────
// E-shape: root on 6th string (low E). Open position = fret 0 = E
// A-shape: root on 5th string. Open position = fret 0 = A

type ShapeTemplate = { f: (number | null)[]; label: string }

const E_SHAPES: Record<string, ShapeTemplate> = {
  '':      { f: [0, 2, 2, 1, 0, 0], label: 'E shape' },
  'm':     { f: [0, 2, 2, 0, 0, 0], label: 'E shape' },
  '7':     { f: [0, 2, 0, 1, 0, 0], label: 'E shape' },
  'm7':    { f: [0, 2, 0, 0, 0, 0], label: 'E shape' },
  'maj7':  { f: [0, 2, 1, 1, 0, 0], label: 'E shape' },
  'sus4':  { f: [0, 2, 2, 2, 0, 0], label: 'E shape' },
  'sus2':  { f: [0, 2, 2, 1, null, 2], label: 'E shape' },
  'dim':   { f: [null, 2, 3, 1, 0, null], label: 'E shape' },
  'aug':   { f: [null, 2, 2, 1, 1, null], label: 'E shape' },
  '9':     { f: [0, 2, 0, 1, 0, 2], label: 'E shape' },
  '6':     { f: [0, 2, 2, 1, 2, 0], label: 'E shape' },
  'm6':    { f: [0, 2, 2, 0, 2, 0], label: 'E shape' },
  '7sus4': { f: [0, 2, 0, 2, 0, 0], label: 'E shape' },
  'm9':    { f: [0, 2, 0, 0, 0, 2], label: 'E shape' },
  '11':    { f: [0, 2, 0, 2, 0, 0], label: 'E shape' },
}

const A_SHAPES: Record<string, ShapeTemplate> = {
  '':      { f: [null, 0, 2, 2, 2, 0], label: 'A shape' },
  'm':     { f: [null, 0, 2, 2, 1, 0], label: 'A shape' },
  '7':     { f: [null, 0, 2, 0, 2, 0], label: 'A shape' },
  'm7':    { f: [null, 0, 2, 0, 1, 0], label: 'A shape' },
  'maj7':  { f: [null, 0, 2, 1, 2, 0], label: 'A shape' },
  'sus4':  { f: [null, 0, 2, 2, 3, 0], label: 'A shape' },
  'sus2':  { f: [null, 0, 2, 2, 0, 0], label: 'A shape' },
  'dim':   { f: [null, 0, 1, 2, 1, null], label: 'A shape' },
  'aug':   { f: [null, 0, 2, 2, 2, 1], label: 'A shape' },
  '9':     { f: [null, 0, 2, 4, 2, 3], label: 'A shape' },
  'add9':  { f: [null, 0, 2, 2, 2, 0], label: 'A shape' },
  '6':     { f: [null, 0, 2, 2, 2, 2], label: 'A shape' },
  'm6':    { f: [null, 0, 2, 2, 1, 2], label: 'A shape' },
  '7sus4': { f: [null, 0, 2, 0, 3, 0], label: 'A shape' },
  'm9':    { f: [null, 0, 2, 0, 1, 2], label: 'A shape' },
  '11':    { f: [null, 0, 0, 0, 2, 0], label: 'A shape' },
}

// Semitone offsets from E for each root (E-shape uses 6th string root)
const E_OFFSETS: Record<string, number> = {
  'E': 0, 'F': 1, 'F#': 2, 'Gb': 2, 'G': 3, 'G#': 4, 'Ab': 4,
  'A': 5, 'A#': 6, 'Bb': 6, 'B': 7, 'C': 8, 'C#': 9, 'Db': 9,
  'D': 10, 'D#': 11, 'Eb': 11,
}

// Semitone offsets from A for each root (A-shape uses 5th string root)
const A_OFFSETS: Record<string, number> = {
  'A': 0, 'A#': 1, 'Bb': 1, 'B': 2, 'C': 3, 'C#': 4, 'Db': 4,
  'D': 5, 'D#': 6, 'Eb': 6, 'E': 7, 'F': 8, 'F#': 9, 'Gb': 9,
  'G': 10, 'G#': 11, 'Ab': 11,
}

const ROOT_NOTES = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
]

const QUALITIES = [
  '', 'm', '7', 'm7', 'maj7', 'sus4', 'sus2', 'dim', 'aug',
  '9', 'add9', '6', 'm6', '7sus4', 'm9', '11',
]

function transposeShape(
  template: ShapeTemplate,
  offset: number,
): ChordVoicing | null {
  if (offset === 0) return null // open shapes are in curated or skip to avoid duplicates
  // Transpose: add offset to every non-null fret
  const frets = template.f.map(f => (f === null ? null : f + offset))
  // Skip if any fret goes above 17
  if (frets.some(f => f !== null && f > 17)) return null
  // Calculate start fret for display (lowest non-zero, non-null fret - 1, minimum 0)
  const playedFrets = frets.filter((f): f is number => f !== null && f > 0)
  if (playedFrets.length === 0) return null
  const minFret = Math.min(...playedFrets)
  const maxFret = Math.max(...playedFrets)
  // If the span is more than 5 frets, it's unplayable
  if (maxFret - minFret > 4) return null
  const startFret = Math.max(0, minFret - 1)
  const label = minFret <= 3 ? `${ordinal(minFret)} fret` : `${template.label} ${ordinal(minFret)} fret`
  return { f: frets, s: startFret, l: label }
}

function ordinal(n: number): string {
  if (n === 0) return 'open'
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function generateChordDb(): Record<string, ChordVoicing[]> {
  const db: Record<string, ChordVoicing[]> = {}

  for (const root of ROOT_NOTES) {
    for (const quality of QUALITIES) {
      const name = root + quality
      const voicings: ChordVoicing[] = []

      // Start with curated voicings
      if (CURATED[name]) {
        voicings.push(...CURATED[name])
      }

      // Generate E-shape barre
      const eOffset = E_OFFSETS[root]
      const eTemplate = E_SHAPES[quality]
      if (eOffset !== undefined && eTemplate) {
        const v = transposeShape(eTemplate, eOffset)
        if (v && !isDuplicate(voicings, v)) {
          voicings.push(v)
        }
      }

      // Generate A-shape barre
      const aOffset = A_OFFSETS[root]
      const aTemplate = A_SHAPES[quality]
      if (aOffset !== undefined && aTemplate) {
        const v = transposeShape(aTemplate, aOffset)
        if (v && !isDuplicate(voicings, v)) {
          voicings.push(v)
        }
      }

      if (voicings.length > 0) {
        db[name] = voicings
      }
    }
  }

  return db
}

function isDuplicate(existing: ChordVoicing[], candidate: ChordVoicing): boolean {
  return existing.some(v =>
    v.f.length === candidate.f.length &&
    v.f.every((f, i) => f === candidate.f[i]),
  )
}

export const CHORD_DB: Record<string, ChordVoicing[]> = generateChordDb()
