import { lookupChord, normalizeQuality, type ChordVoicing } from '../data/chords-db'

/**
 * Band shapes for electric guitar: compact three- and four-string voicings
 * up the neck with no open strings, and each song's chords kept in one area
 * of the neck in a style that suits its sound. The chord library behind the
 * diagrams is mostly open chords and full barres, which suit a guitar on its
 * own, not one playing with bass and keys.
 */

/** Standard tuning, low E to high E, as pitch classes. */
const OPEN_STRINGS = [4, 9, 2, 7, 11, 4]

const NOTE: Record<string, number> = {
  C: 0, 'B#': 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, F: 5, 'E#': 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11,
}

/** Semitones above the root for each chord quality, named as the chord library names them. */
const INTERVALS: Record<string, number[]> = {
  '': [0, 4, 7], m: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8],
  sus2: [0, 2, 7], sus4: [0, 5, 7], sus24: [0, 2, 5, 7], '5': [0, 7],
  b5: [0, 4, 6], '6b5': [0, 4, 6, 9],
  '6': [0, 4, 7, 9], m6: [0, 3, 7, 9], '69': [0, 4, 7, 9, 2], m69: [0, 3, 7, 9, 2],
  '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], m7b5: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9], mmaj7: [0, 3, 7, 11], '7sus4': [0, 5, 7, 10], '7b5': [0, 4, 6, 10],
  aug7: [0, 4, 8, 10], maj7b5: [0, 4, 6, 11], 'maj7#5': [0, 4, 8, 11],
  add9: [0, 4, 7, 2], madd9: [0, 3, 7, 2],
  '9': [0, 4, 7, 10, 2], m9: [0, 3, 7, 10, 2], maj9: [0, 4, 7, 11, 2], mmaj9: [0, 3, 7, 11, 2],
  '7b9': [0, 4, 7, 10, 1], '7#9': [0, 4, 7, 10, 3], '9b5': [0, 4, 6, 10, 2], aug9: [0, 4, 8, 10, 2],
  '11': [0, 7, 10, 2, 5], m11: [0, 3, 7, 10, 2, 5], maj11: [0, 4, 7, 11, 2, 5], '9#11': [0, 4, 7, 10, 2, 6],
  '13': [0, 4, 7, 10, 2, 9], maj13: [0, 4, 7, 11, 2, 9],
}

export interface ChordNotes {
  root: number
  /** A slash chord's bass note, which has to be the lowest note played. */
  bass: number | null
  /** Every note the chord may sound. */
  tones: number[]
  /** The notes a shape of at most four strings cannot leave out. */
  essential: number[]
}

/** The notes a chord symbol asks for, or null for one this does not know. */
export function chordNotes(name: string): ChordNotes | null {
  const m = name.match(/^([A-G][#b]?)(.*?)(?:\/([A-G][#b]?))?$/)
  if (!m || NOTE[m[1]] === undefined) return null
  const root = NOTE[m[1]]
  let quality = normalizeQuality(m[2].replace('no3d', '').replace(/^us/, 'sus'))
  // A bare alteration in brackets implies the dominant seventh: A(b9) is A7b9
  if (quality === '#5') quality = 'aug'
  else if (/^[b#]/.test(quality) && quality !== 'b5') quality = '7' + quality
  const intervals = INTERVALS[quality]
  if (!intervals) return null
  const bass = m[3] === undefined ? null : NOTE[m[3]] ?? null

  // Four strings at most: the fifth goes first, then the ninth of an
  // eleventh or thirteenth chord, then the root.
  let keep = [...intervals]
  if (keep.length >= 4 && keep.includes(7)) keep = keep.filter(x => x !== 7)
  while (keep.length > 4) {
    if (keep.includes(2) && (keep.includes(5) || keep.includes(9) || keep.includes(6))) keep = keep.filter(x => x !== 2)
    else if (keep.includes(0)) keep = keep.filter(x => x !== 0)
    else break
  }
  const pc = (x: number) => (root + x) % 12
  return { root, bass, tones: intervals.map(pc), essential: keep.map(pc) }
}

/** String sets, lowest string first. Two skip a string so a slash bass can sit apart. */
const STRING_SETS: number[][] = [
  [3, 4, 5], [2, 3, 4], [1, 2, 3], [0, 1, 2],
  [2, 3, 4, 5], [1, 2, 3, 4], [0, 1, 2, 3],
  [0, 2, 3, 4], [1, 3, 4, 5],
]
const MAX_FRET = 15
/** Four frets under the hand, no more. */
const MAX_SPAN = 3

type Group = 'top' | 'middle' | 'low'
const groupOf = (strings: number[]): Group =>
  strings.includes(5) ? 'top' : strings[0] === 0 ? 'low' : 'middle'

interface Shape {
  strings: number[]
  frets: number[]
  min: number
  max: number
  /** Lower is a better shape to play, before thinking about the song. */
  score: number
}

const pitchAt = (string: number, fret: number) => (OPEN_STRINGS[string] + fret) % 12

function findShapes(notes: ChordNotes): Shape[] {
  const found: Shape[] = []
  const allowed = new Set(notes.tones)
  const needed = notes.bass === null ? notes.essential : [...new Set([...notes.essential, notes.bass])]
  const power = notes.tones.length === 2

  for (const strings of STRING_SETS) {
    if (needed.length > strings.length) continue
    // A power chord is root and fifth on the lower strings, nothing more
    if (power && (strings.length > 3 || strings[0] > 2)) continue
    const options = strings.map((string, i) => {
      const frets: number[] = []
      for (let fret = 1; fret <= MAX_FRET; fret++) {
        const pc = pitchAt(string, fret)
        if (i === 0 && notes.bass !== null ? pc === notes.bass : allowed.has(pc)) frets.push(fret)
      }
      return frets
    })
    const chosen: number[] = []
    const walk = (i: number, lo: number, hi: number) => {
      if (i === strings.length) {
        const sounding = new Set(chosen.map((f, k) => pitchAt(strings[k], f)))
        if (!needed.every(n => sounding.has(n))) return
        if (power && pitchAt(strings[0], chosen[0]) !== notes.root) return
        found.push({ strings, frets: [...chosen], min: lo, max: hi, score: 0 })
        return
      }
      for (const fret of options[i]) {
        const nlo = Math.min(lo, fret)
        const nhi = Math.max(hi, fret)
        if (nhi - nlo > MAX_SPAN) continue
        chosen.push(fret)
        walk(i + 1, nlo, nhi)
        chosen.pop()
      }
    }
    walk(0, Infinity, -Infinity)
  }

  for (const shape of found) shape.score = scoreShape(shape, notes)
  return found
}

/** Lower is a better shape to play with a band, before thinking about the song. */
function scoreShape(shape: Shape, notes: ChordNotes): number {
  const center = (shape.min + shape.max) / 2
  let score = 0.15 * Math.abs(center - 7)
  if (shape.max - shape.min === MAX_SPAN) score += 0.5
  if (shape.min < 2) score += 0.5 // first position rings like an open chord
  if (shape.max > 12) score += 0.8
  if (notes.bass === null && pitchAt(shape.strings[0], shape.frets[0]) === notes.root) score -= 1
  const distinct = new Set(shape.frets.map((f, k) => pitchAt(shape.strings[k], f))).size
  if (shape.strings.length === 4 && distinct < 4) score += 0.3 // a doubled note: three strings do the same job
  return score
}

const ordinal = (n: number) =>
  `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`

function toVoicing(shape: Shape): ChordVoicing {
  const f: (number | null)[] = [null, null, null, null, null, null]
  const atNut = shape.max <= 5
  shape.strings.forEach((string, k) => {
    f[string] = atNut ? shape.frets[k] : shape.frets[k] - shape.min + 1
  })
  return { f, s: atNut ? 0 : shape.min, l: `${ordinal(shape.min)} fret` }
}

/** Absolute frets, so shapes drawn from different start frets compare equal. */
function absolute(v: ChordVoicing): string {
  return v.f.map(x => (x === null ? 'x' : x === 0 ? 0 : v.s === 0 ? x : v.s + x - 1)).join(',')
}

interface Candidate {
  /** Index in the chord's list of shapes. */
  index: number
  /** The string set, as text, for quick comparison. */
  key: string
  strings: number[]
  /** Absolute frets, 0 for an open string. */
  frets: number[]
  /** Lowest and highest fretted notes (0 and 0 for an all-open shape). */
  min: number
  max: number
  /** From the chord library, where 0 is the chord's usual shape. */
  libraryRank: number | null
  /** The root, or a slash chord's bass, is the lowest note. */
  rootLow: boolean
  /** Chord notes left out: 1 for each one that matters, a quarter for a fifth. */
  missing: number
  /** Notes sounded that are not in the chord at all. */
  extra: number
  open: boolean
}

interface Entry {
  list: ChordVoicing[]
  /** Every shape of the chord, for recommending one. */
  band: Candidate[]
  notes: ChordNotes | null
  quality: string
}

function describe(v: ChordVoicing, index: number, libraryRank: number | null, notes: ChordNotes): Candidate | null {
  const strings: number[] = []
  const frets: number[] = []
  v.f.forEach((f, string) => {
    if (f === null) return
    strings.push(string)
    frets.push(f === 0 ? 0 : v.s === 0 ? f : v.s + f - 1)
  })
  if (strings.length < 2) return null
  const fretted = frets.filter(f => f > 0)
  const sounding = new Set(frets.map((f, k) => pitchAt(strings[k], f)))
  const missing = notes.tones
    .filter(t => !sounding.has(t))
    .reduce((sum, t) => sum + (notes.essential.includes(t) ? 1 : 0.25), 0)
  const extra = [...sounding].filter(p => !notes.tones.includes(p) && p !== notes.bass).length
  return {
    index,
    key: strings.join(''),
    strings,
    frets,
    min: fretted.length ? Math.min(...fretted) : 0,
    max: fretted.length ? Math.max(...fretted) : 0,
    libraryRank,
    rootLow: pitchAt(strings[0], frets[0]) === (notes.bass ?? notes.root),
    missing,
    extra,
    open: frets.includes(0),
  }
}

const cache = new Map<string, Entry>()

function entryFor(name: string): Entry {
  const hit = cache.get(name)
  if (hit) return hit
  const library = lookupChord(name) ?? []
  const notes = chordNotes(name)
  const band: Entry['band'] = []
  const list = [...library]
  if (notes) {
    library.forEach((voicing, index) => {
      const shape = describe(voicing, index, index, notes)
      if (shape) band.push(shape)
    })
    // The two best shapes in each area of the neck on each group of strings.
    // The order is fixed by position, not by score: a saved pick is an index
    // into this list, so it must not move when the scoring is tuned.
    const bySlot = new Map<string, Shape[]>()
    for (const shape of findShapes(notes)) {
      if (shape.min > 12) continue
      const slot = `${Math.floor((shape.min - 1) / 3)}:${groupOf(shape.strings)}`
      bySlot.set(slot, [...(bySlot.get(slot) ?? []), shape])
    }
    const kept = [...bySlot.values()].flatMap(shapes => shapes.sort((a, b) => a.score - b.score).slice(0, 2))
    const seen = new Set(library.map(absolute))
    kept.sort((a, b) => a.min - b.min || a.strings[0] - b.strings[0] || a.frets.join().localeCompare(b.frets.join()))
    for (const shape of kept) {
      const voicing = toVoicing(shape)
      if (seen.has(absolute(voicing))) continue
      seen.add(absolute(voicing))
      const described = describe(voicing, list.length, null, notes)
      if (described) band.push(described)
      list.push(voicing)
    }
  }
  const quality = normalizeQuality((name.match(/^[A-G][#b]?(.*?)(?:\/[A-G][#b]?)?$/)?.[1] ?? '').replace(/^us/, 'sus'))
  const entry = { list, band, notes, quality }
  cache.set(name, entry)
  return entry
}

/**
 * Every shape for a chord: the chord library's first, in their original
 * order so saved picks keep their meaning, then the band shapes.
 */
export function voicingsFor(name: string): ChordVoicing[] {
  return entryFor(name).list
}

/**
 * How far a shape is from the chord as a guitarist would normally play it.
 * The chord comes first: its root (or slash bass) at the bottom, no note
 * that matters left out, and the library's usual shape before its other
 * positions. Band shapes built here only fill gaps, like slash chords the
 * library does not have.
 */
function unusual(c: Candidate, notes: ChordNotes, quality: string, acoustic: boolean): number {
  let cost = 0
  if (!c.rootLow) cost += 6
  cost += 3 * c.missing + 3 * c.extra
  cost += c.libraryRank === null ? 2.5 : 0.15 * c.libraryRank
  if (!isFamiliar(c, notes, quality)) cost += 0.8
  cost += 0.2 * Math.max(0, 5 - c.strings.length) // the usual chords are full ones
  if (acoustic) cost += c.open ? -1 : 0.5
  return cost
}

/** Roots with open-position chords every guitarist knows. */
const OPEN_MAJOR = new Set([0, 2, 4, 7, 9]) // C D E G A
const OPEN_MINOR = new Set([2, 4, 9]) // Dm Em Am

/**
 * The shapes a guitarist reaches for first: an E- or A-shape barre with the
 * index finger on the root, or a real open chord (C, A, G, E, D and their
 * sevenths; Am, Em, Dm).
 */
function isFamiliar(c: Candidate, notes: ChordNotes, quality: string): boolean {
  if (!c.rootLow || notes.bass !== null) return false
  const rootString = c.strings[0]
  const barreFromRoot = rootString <= 1 && c.frets[0] > 0 && c.frets[0] === c.min
  if (barreFromRoot) return true
  const minor = /^m(?!aj)/.test(quality)
  const openKey = minor ? OPEN_MINOR.has(notes.root) : OPEN_MAJOR.has(notes.root)
  return c.open && c.max <= 3 && c.strings.length >= 4 && openKey
}

/** Keeping a song's shapes near each other only breaks ties. */
const STAY_NEAR = 0.1
const MOVE = 0.25

/** The cost of moving the hand from one shape to the next. */
function move(a: Candidate, b: Candidate): number {
  const center = (c: Candidate) => (c.min + c.max) / 2
  const shift = 0.5 + 0.3 * Math.abs(center(a) - center(b))
  if (a.key === b.key) {
    // Same strings: count the frets the fingers travel. A line cliche that
    // moves one finger a fret at a time is nearly free; a jump up the neck
    // costs no more than it would across strings.
    return Math.min(shift, 0.25 * a.frets.reduce((sum, f, k) => sum + Math.abs(f - b.frets[k]), 0))
  }
  return shift
}

/**
 * The shape to recommend for each chord of a song, as an index into
 * `voicingsFor(name)`. The chords come in the order they first appear. Each
 * chord gets its usual shape; where a chord has more than one good shape,
 * the one that sits with the song's other chords wins. An acoustic song
 * leans to open chords.
 */
export function bandPositions(chords: Array<{ name: string; weight: number }>, style?: string): Record<string, number> {
  const picks: Record<string, number> = {}
  for (const chord of chords) picks[chord.name] = 0
  const acoustic = style === 'ACOUSTIC'

  const steps = chords
    .map(chord => ({ ...chord, entry: entryFor(chord.name), shapes: entryFor(chord.name).band }))
    .filter(step => step.shapes.length > 0 && step.entry.notes !== null)
  if (steps.length === 0) return picks

  let best: { total: number; choice: Candidate[] } | null = null
  for (let home = 1; home <= 12; home++) {
    const own = (step: (typeof steps)[number], shape: Candidate) =>
      step.weight * (unusual(shape, step.entry.notes!, step.entry.quality, acoustic) + STAY_NEAR * Math.abs((shape.min + shape.max) / 2 - home))
    // Cheapest way to reach each shape of each chord, walking the song in order
    let totals = steps[0].shapes.map(shape => own(steps[0], shape))
    const back: number[][] = []
    for (let i = 1; i < steps.length; i++) {
      const prev = steps[i - 1].shapes
      const from: number[] = []
      totals = steps[i].shapes.map(shape => {
        let bestPrev = 0
        let bestCost = Infinity
        prev.forEach((p, k) => {
          const c = totals[k] + MOVE * move(p, shape)
          if (c < bestCost) {
            bestCost = c
            bestPrev = k
          }
        })
        from.push(bestPrev)
        return bestCost + own(steps[i], shape)
      })
      back.push(from)
    }
    let last = 0
    totals.forEach((t, k) => {
      if (t < totals[last]) last = k
    })
    if (!best || totals[last] < best.total) {
      const choice: Candidate[] = []
      let k = last
      for (let i = steps.length - 1; i >= 0; i--) {
        choice[i] = steps[i].shapes[k]
        if (i > 0) k = back[i - 1][k]
      }
      best = { total: totals[last], choice }
    }
  }
  steps.forEach((step, i) => {
    picks[step.name] = best!.choice[i].index
  })
  return picks
}

/**
 * The frets a set of shapes covers, for showing a song's recommended area of
 * the neck. Open strings mark it as an open-position song.
 */
export function fretSpan(shapes: ChordVoicing[]): { min: number; max: number; open: boolean } | null {
  const fretted: number[] = []
  let open = false
  for (const v of shapes) {
    for (const f of v.f) {
      if (f === null) continue
      if (f === 0) open = true
      else fretted.push(v.s === 0 ? f : v.s + f - 1)
    }
  }
  if (fretted.length === 0) return open ? { min: 0, max: 0, open } : null
  return { min: Math.min(...fretted), max: Math.max(...fretted), open }
}
